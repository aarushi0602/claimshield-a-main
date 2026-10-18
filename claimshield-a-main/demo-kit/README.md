# ClaimShield AI demo kit

Mock documents for the video walkthrough and the end-to-end tests. **Everything is fictional**: the patients, hospitals, insurer, TPA, doctors and policy numbers. Every page is watermarked *SYNTHETIC - FOR DEMO*.

Regenerate with `python scripts/generate_demo_kit.py`. The answer key for the headline case is `expected.json`, and `frontend/e2e/demo-kit.spec.ts` checks it through the website.

## The headline case

**Meera Krishnan (41), laparoscopic appendectomy, Aarogya Multispeciality Hospital, Bengaluru.** Cashless claim, network hospital, policy *Niramaya Health Plus* (`NHP-2026-207731`) from Sahyadri General Insurance.

| File | What it is | Upload to |
|---|---|---|
| `01_hospital_final_bill_aarogya.pdf` | Itemised final bill + cashless settlement | New audit → Medical documents (main bill) |
| `02_discharge_summary.pdf` | Discharge summary | New audit → Medical documents |
| `03_lab_investigation_report.pdf` | Lab / investigation report | New audit → Medical documents |
| `04_prescription.pdf` | Discharge prescription | New audit → Medical documents |
| `05_claim_form.pdf` | Health insurance claim form (Part A) | New audit → Medical documents |
| `06_policy_wording_niramaya_health_plus.pdf` | Policy wording + schedule | New audit → Insurance documents (main policy) |
| `07_policy_renewal_schedule.pdf` | Renewal schedule | New audit → Insurance documents · Policy history |
| `08_claim_rejection_letter.pdf` | Rejection of a separate hernia claim | Denial support |
| `09_preauth_hospital_cost_estimate.pdf` | Cost estimate for a planned knee replacement | Pre-authorization |
| `10_preauth_doctor_admission_advice.pdf` | Doctor's admission advice | Pre-authorization |

### What ClaimShield finds (verified against the live app)

As printed: gross **₹1,33,540**, insurer approved **₹1,05,192**, patient asked to pay **₹28,348**.

| # | Finding | Bill line | Policy clause | Confidence | Amount |
|---|---|---|---|---|---|
| 1 | 20% co-payment taken at a **network** hospital; the policy says 0% | settlement | §3.2 Co-payment | High | ₹26,528 |
| 2 | Room charged **4 days for a 3-night stay** | line 1 | §2.3 Expenses actually incurred | High | ₹4,200 |
| 3 | Gloves & masks deducted, but the **consumables benefit** covers them | line 13 | §3.4 Consumables benefit | High | ₹920 |
| 4 | Inj. Ceftriaxone **8 × ₹180 billed as ₹2,160** | line 10 | §2.3 | High | ₹720 |
| 5 | **CRP test entered twice** on the same day | lines 4–5 | §2.3 | High | ₹700 |
| 6 | **Grade IV anaesthesia** for a routine appendectomy | line 9 | §2.2 Reasonable & customary | Worth reviewing | ₹11,000 |

Result: **should owe ₹900, likely recovery ₹27,448**. Attendant food (line 14) is correctly excluded under §4.4 and is *not* flagged. That's a good moment to show precision.

The document checker classifies all seven claim documents correctly, and the cashless checklist comes out complete (6/6).

## Video script (about 5 minutes)

1. **Landing (20s).** "Know what your health insurance should really pay." Scroll past *How it works* and the sample cases.
2. **Upload (40s).** Click **New audit**. Drag files `01`–`05` into *Medical documents* and `06`–`07` into *Insurance documents*. The main bill and main policy default to the first file. Choose **Cashless**, then click **Run claim audit**.
3. **Live agents (40s).** On the progress screen, the step cards and live agent trace show document check → intake → clause index → pricing bench → claim audit → reconciliation → dispute. Mention that the job keeps running if you close the tab.
4. **Results (90s).**
   - Headline: *paid ₹28,348, should owe ₹900, potential recovery ₹27,448*.
   - Click the ledger row **Co-payment applied that the policy doesn't require**. The evidence inspector shows the settlement line, then the **Policy clause & rule** tab shows the §3.2 quote.
   - Click **L4** on the duplicate CRP. The itemised bill scrolls to the highlighted line.
   - Point out that the **Worth reviewing** anaesthesia finding is phrased as a question, not an accusation.
   - Scroll to *How your entitlement was calculated* to show the printed bill next to the bill after corrections.
5. **Letters (30s).** Open the **To the insurer** tab and copy the letter. Download the reconciliation report PDF.
6. **Denial support (40s).** Open **Claim tools → Denial support**. Upload `08_claim_rejection_letter.pdf` and click *Use the policy from your audit*.
   - Hernia reason → **Insufficient evidence**: the waiting period depends on continuity of cover, so submit prior schedules.
   - Consumables reason → **Potentially inconsistent with policy**: §3.4 says consumables are payable.
   - Show the editable appeal draft.
7. **Policy history (20s).** Upload `06` + `07`. Set treatment *Hernia repair*, date *28-Sep-2026* and continuity *Confirmed with supporting documents*. It finds the 24- and 36-month waiting periods and lists the prior-policy documents that are still missing.
8. **Pre-authorization (30s).** Upload `06` as the policy and `09` + `10` as supporting documents, and tick estimate, advice and policy schedule. Use the values below. ClaimShield warns that joint replacement falls under the §4.3 waiting period. If you type the insurer name slightly differently, it flags the mismatch.
9. **Precision close (20s).** Back on **New audit**, run the sample **Sanjeevani Hospital (clean bill)**: *No discrepancies found*.

### Values to type

**Pre-authorization**

| Field | Value |
|---|---|
| Patient name | Ramesh Iyer |
| Treatment | Total knee replacement |
| Estimated cost (₹) | 245000 |
| Hospital name | Aarogya Multispeciality Hospital |
| Hospital address | Marathahalli, Bengaluru |
| Network status | Confirmed network |
| Insurer name | Sahyadri General Insurance Ltd. (fictional) |
| TPA | CareLink Health TPA |
| Policy number | NHP-2026-207731 |
| Plan name | Niramaya Health Plus |
| Policy start / end | 01-06-2026 / 31-05-2027 |

**Plan treatment / Compare options** (policy `06`)

| Field | Value |
|---|---|
| Treatment | Laparoscopic appendectomy |
| Estimated total | 135000 |
| Room category | Private |
| Room rate | 6500 |
| Nights | 3 |
| Network | Network |

Plan treatment shows insurer **₹1,30,500**, you **₹4,500**. That ₹4,500 is room-rent excess, because ₹6,500/day is above the §3.1 limit of ₹5,000/day.

In Compare options, add a scenario named *Twin sharing* with estimated cost 130500, room category *Shared* and room rate 4200. Your share drops to **₹0**.

**Policy assistant** (policy `06`): ask *"Are gloves and masks covered?"* in English, Hindi or Kannada. The answer is grounded in §3.4.
