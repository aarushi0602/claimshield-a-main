"""Evidence-first claim journey, composed with the existing six audit agents."""
from __future__ import annotations

from ..services.document_check import check_documents


def document_agent(manifest, svc, trace, claim_type):
    trace.emit('document_agent', 'start', 'Checking your medical and insurance documents')
    documents = []
    warnings = []
    for entry in manifest:
        content = svc.storage.get(entry['key'])
        try:
            try:
                raw = svc.parser.parse(content)
            except Exception:
                if svc.parser is svc.local_parser:
                    raise
                raw = svc.local_parser.parse(content)
        except Exception:
            raw = None
            warnings.append(f"Could not read {entry['name']}. Upload a readable PDF or ask for a manual check.")
        documents.append({'filename': entry['name'], 'content': content, 'raw': raw})
    result = check_documents(documents, claim_type=claim_type, data_dir=svc.settings.data_dir)
    for doc, entry in zip(result['documents'], manifest):
        doc.update(group=entry['group'], source_key=entry['key'])
    result['warnings'] = warnings
    trace.emit('document_agent', 'result', 'Document checklist ready', summary=result['summary'])
    return result


def guidance_agent(state, checklist, manifest):
    """Account for every extracted clause; never equate extraction with eligibility."""
    policy = state.get('policy_doc') or {}
    terms = state.get('policy_terms') or {}
    bill = state.get('bill') or {}
    refs = terms.get('clause_refs', {})
    findings = state.get('findings', [])
    clauses = []
    for clause in policy.get('clauses', []):
        topics = [topic for topic, ref in refs.items() if ref == clause['clause_id']]
        related = [f for f in findings if (f.get('policy') or {}).get('clause_id') == clause['clause_id']
                   and (f.get('policy') or {}).get('quote') == clause['text']]
        # A retrieved clause is not proof that all of its conditions were evaluated.
        clauses.append({**clause, 'status': 'review_finding' if related else 'needs_verification',
                        'topics': topics, 'finding_ids': [f['finding_id'] for f in related],
                        'explanation': ' '.join(f['explanation'] for f in related) if related else
                        'This clause was extracted. Its full applicability to this claim still needs confirmation.',
                        'next_step': 'Review the cited evidence with the insurer.' if related else
                        'Ask the insurer to confirm this clause against the treatment and policy schedule.'})

    gaps = [
        'Confirm the patient is insured and the policy was active on the treatment date.',
        'Confirm waiting periods, pre-existing-condition terms and treatment exclusions.',
        'Confirm remaining sum insured, earlier claims, deductible and hospital network status.',
        'Have the insurer confirm medical necessity and any pre-authorization requirements.',
    ]
    if bill.get('policy_number') and policy.get('policy_number') and bill['policy_number'] != policy['policy_number']:
        gaps.insert(0, 'The bill and policy numbers differ. Supply the matching policy before relying on the audit.')
    extras = [d for d in manifest if d['group'] == 'insurance' and not d.get('primary')]
    if extras:
        gaps.insert(0, 'Additional insurance documents need reconciliation with the main wording. Endorsements and renewals may change coverage; use Policy history below.')
    if not clauses:
        gaps.insert(0, 'No numbered policy clauses were extracted. Supply full readable policy wording for clause review.')
    gaps += checklist.get('warnings', [])
    gaps += [f"Resolve unclear policy topic: {t.replace('_', ' ')}." for t in terms.get('uncertain_topics', [])]

    actions = []
    for item in checklist['checklist']:
        if item['status'] != 'complete':
            actions.append({'priority': 'Before submission', 'title': f"Check {item['label'].lower()}",
                            'detail': item['note'], 'basis': item['requirement_kind'], 'tool': 'document-check-panel'})
    for gap in gaps:
        actions.append({'priority': 'Verify coverage', 'title': gap, 'detail': 'This is unresolved, not a claim rejection.',
                        'basis': 'Evidence gap', 'tool': 'policy-history-panel' if 'insurance documents' in gap else 'policy-explainer-panel'})
    for finding in findings:
        actions.append({'priority': 'Review potential recovery', 'title': finding['title'],
                        'detail': finding['explanation'], 'basis': finding['confidence'],
                        'finding_id': finding['finding_id'], 'tool': 'findings-panel'})
    actions.append({'priority': 'Submit and track', 'title': 'Send a complete claim pack to the insurer or hospital insurance desk.',
                    'detail': 'Keep the submission acknowledgement and claim number. Record queries and respond with the requested evidence. Review any draft before sending.',
                    'basis': 'Next step after verification', 'tool': 'timeline-panel'})
    recon = state.get('reconciliation') or {}
    excluded = set((recon.get('entitlement_as_billed') or {}).get('non_payable_lines', []))
    return {'status': 'needs_verification', 'headline': 'Your claim needs a few confirmations',
            'notice': 'This is an evidence review, not insurer approval or rejection. Recovery figures are audit scenarios, not guaranteed coverage. Medical records are checked for document completeness; their clinical facts are not automatically verified against every clause.',
            'clauses': clauses, 'clause_count': len(clauses), 'verification_gaps': gaps,
            'document_check': checklist, 'next_steps': actions,
            'expenses': [{'line_no': line['line_no'], 'description': line['description'],
                          'status': 'potentially_non_payable' if line['line_no'] in excluded else 'needs_verification'}
                         for line in bill.get('line_items', [])],
            'recovery_scenario': {'likely': recon.get('recovery_likely'), 'upper': recon.get('recovery_upper'),
                                  'confirmed': False}}
