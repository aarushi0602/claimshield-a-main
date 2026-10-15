import asyncio
import json
import time
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from claimshield.api.main import app
from claimshield.config import PROJECT_ROOT
from claimshield.services.jobs import JobQueue, QueueFull


def test_queue_capacity_is_atomic_and_owner_scoped(tmp_path):
    queue = JobQueue(tmp_path / 'queue.db', capacity=4, per_owner=2)
    def submit(i):
        try:
            queue.submit(str(i), 'alice', {'i': i})
            return True
        except QueueFull:
            return False
    with ThreadPoolExecutor(max_workers=8) as pool:
        assert sum(pool.map(submit, range(12))) == 2
    queue.submit('bob', 'bob', {})
    queue.submit('carol', 'carol', {})
    with pytest.raises(QueueFull):
        queue.submit('dave', 'dave', {})


def test_worker_leases_restart_recovery_and_stale_ack(tmp_path):
    path = tmp_path / 'queue.db'
    queue = JobQueue(path)
    queue.submit('case-1', 'owner', {'test': 'persisted'})
    first = queue.claim()
    assert first['payload'] == {'test': 'persisted'}
    restarted = JobQueue(path)
    assert restarted.claim() is None
    with queue.connect() as db:
        db.execute('UPDATE jobs SET lease=0')
    second = restarted.claim()
    assert second['attempts'] == 2
    queue.finish(first)  # An old worker cannot acknowledge the new lease.
    assert queue.status('case-1')['status'] == 'running'
    restarted.finish(second, retry=True)
    assert queue.claim() is None  # Backoff.
    with queue.connect() as db:
        db.execute('UPDATE jobs SET available=0')
    third = queue.claim()
    queue.finish(third)
    assert queue.claim() is None


def test_claim_review_round_trip_and_validation(monkeypatch):
    monkeypatch.setenv('CLAIMSHIELD_USE_ADK', 'false')
    samples = PROJECT_ROOT / 'data' / 'samples'
    bill = (samples / 'bills' / 'bill_001_sunrise_appendectomy.pdf').read_bytes()
    policy = (samples / 'policies' / 'suraksha_health_gold.pdf').read_bytes()
    files = [('medical_documents', ('bill.pdf', bill, 'application/pdf')),
             ('medical_documents', ('duplicate.pdf', bill, 'application/pdf')),
             ('insurance_documents', ('policy.pdf', policy, 'application/pdf'))]
    with TestClient(app, base_url='http://localhost', client=('127.0.0.1', 50000),
                    headers={'X-ClaimShield-Request': '1'}) as client:
        assert client.post('/api/claim-review', files=files, data={'main_policy': 7}).status_code == 422
        assert client.post('/api/claim-review', files=files, data={'claim_type': 'invented'}).status_code == 422
        response = client.post('/api/claim-review', files=files)
        assert response.status_code == 200, response.text
        case_id = response.json()['case_id']
        for _ in range(200):
            result = client.get(f'/api/cases/{case_id}').json()
            if result['status'] != 'running':
                break
            time.sleep(.05)
        assert result['status'] == 'complete', result
        review = result['claim_review']
        assert review['status'] == 'needs_verification'
        assert review['clause_count'] == len(result['policy_doc']['clauses']) > 0
        assert review['document_check']['documents'][1]['status'] == 'duplicate'
        assert review['document_check']['summary']['missing'] > 0
        assert review['next_steps'] and review['verification_gaps']
        assert review['recovery_scenario']['confirmed'] is False
        assert review['recovery_scenario']['likely'] == 24846
        for clause, source in zip(review['clauses'], result['policy_doc']['clauses']):
            assert clause['text'] == source['text']
            assert clause['page'] == source['page']
        assert 'event: end' in client.get(f'/api/cases/{case_id}/events').text


def test_guidance_does_not_approve_missing_or_conflicting_evidence():
    from claimshield.agents.claim_review import guidance_agent
    result = guidance_agent({'bill': {'policy_number': 'one'}, 'policy_doc': {'policy_number': 'two'}},
                            {'checklist': [], 'warnings': []},
                            [{'group': 'insurance', 'primary': False}])
    assert result['status'] == 'needs_verification'
    assert any('numbers differ' in gap for gap in result['verification_gaps'])
    assert any('Additional insurance' in gap for gap in result['verification_gaps'])
    assert any('No numbered' in gap for gap in result['verification_gaps'])
    assert result['recovery_scenario']['likely'] is None
