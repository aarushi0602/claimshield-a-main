"""Generate the demo kit: a realistic claim bundle for the video walkthrough and E2E tests.

Everything here is fictional (patient, hospital, insurer, policy numbers) and every page is
watermarked SYNTHETIC - FOR DEMO. Bills and policies reuse the layout from data/generate.py,
so the audit engine parses them exactly like the bundled samples.

The headline case, Meera Krishnan, laparoscopic appendectomy at Aarogya Multispeciality
Hospital, Bengaluru, under the Niramaya Health Plus policy, has six planted issues:

  1. Room charged 4 days for a 3-night stay                      (hospital, high)
  2. C-reactive protein test entered twice on the same day         (hospital, high)
  3. Inj. Ceftriaxone 8 x Rs.180 billed as Rs.2,160                (hospital, high)
  4. Grade IV anaesthesia for a routine appendectomy               (hospital, worth reviewing)
  5. 20% co-payment applied at a network hospital (policy: 0%)     (insurer, high)
  6. Gloves & masks deducted, but the policy covers consumables    (insurer, high)

Run:  python scripts/generate_demo_kit.py      (writes demo-kit/*.pdf and demo-kit/expected.json)
"""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "demo-kit"

_spec = importlib.util.spec_from_file_location("sample_generator", ROOT / "data" / "generate.py")
gen = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gen)  # type: ignore[union-attr]

H1, H2, BODY, SMALL, CELL, GRID, rs = gen.H1, gen.H2, gen.BODY, gen.SMALL, gen.CELL, gen.GRID, gen.rs


def watermark(canvas, doc):
    """Like data/generate.py's watermark, but the footer avoids the word 'document', which the
    rejection analyser would otherwise list as a document reference."""
    canvas.saveState()
    canvas.setFont("Helvetica-Bold", 46)
    canvas.setFillColor(colors.Color(0.85, 0.1, 0.1, alpha=0.08))
    canvas.translate(A4[0] / 2, A4[1] / 2)
    canvas.rotate(35)
    canvas.drawCentredString(0, 0, "SYNTHETIC - FOR DEMO")
    canvas.restoreState()
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.grey)
    canvas.drawString(15 * mm, 10 * mm, "Synthetic demo file for ClaimShield AI. All names, numbers and organisations are fictional.")
    canvas.drawRightString(A4[0] - 15 * mm, 10 * mm, f"Page {doc.page}")


gen.watermark = watermark  # build_bill / build_policy look this up at call time

HOSPITAL = "Aarogya Multispeciality Hospital"
ADDRESS = "No. 18, Outer Ring Road, Marathahalli, Bengaluru 560037 (fictional)"
PATIENT = "Meera Krishnan"
POLICY_NO = "NHP-2026-207731"
INSURER = "Sahyadri General Insurance Ltd. (fictional)"
TPA = "CareLink Health TPA (fictional)"
UHID = "AMH-0451187"

POLICY = {
    "file": "06_policy_wording_niramaya_health_plus.pdf",
    "insurer": INSURER,
    "plan": "Niramaya Health Plus",
    "policy_number": POLICY_NO,
    "schedule": [
        ("Policy Number", POLICY_NO),
        ("Plan", "Niramaya Health Plus - Individual"),
        ("Sum Insured", "Rs. 5,00,000 per policy year"),
        ("Policy Period", "01/06/2026 to 31/05/2027"),
        ("Insured Person", f"{PATIENT} (fictional), age 41"),
        ("TPA", TPA),
    ],
    "sections": [
        ("Section 1 - Cover", [
            ("1.1", "Sum Insured", "The Sum Insured under this policy is Rs. 5,00,000 per policy year. All admissible claims in a policy year are payable up to the Sum Insured."),
            ("1.2", "In-patient Hospitalisation", "The Company will pay Medical Expenses for In-patient Care incurred for hospitalisation of at least 24 consecutive hours, or for listed Day Care Procedures, for an illness or injury contracted during the policy period."),
        ]),
        ("Section 2 - Definitions", [
            ("2.1", "Medically Necessary Treatment", "Treatment that is required for the medical management of the illness or injury, does not exceed the level of care necessary to provide safe, adequate and appropriate medical care, and is prescribed by a Medical Practitioner."),
            ("2.2", "Reasonable and Customary Charges", "Charges for services or supplies which are the standard charges for the specific provider and consistent with the prevailing charges in the geographical area for identical or similar services."),
            ("2.3", "Expenses Actually Incurred", "Only expenses actually incurred by the Insured Person for services actually rendered are payable. Duplicate entries, and amounts arising from arithmetical errors in the hospital bill, are not expenses actually incurred."),
        ]),
        ("Section 3 - Limits and Benefits", [
            ("3.1", "Room Rent and ICU Charges", "Room rent for a normal room is payable up to 1% of the Sum Insured per day, i.e. Rs. 5,000 per day. ICU charges are payable up to 2% of the Sum Insured per day, i.e. Rs. 10,000 per day. If the Insured Person opts for a room with higher rent, only the excess room rent is non-payable; no proportionate deduction is applied to other charges."),
            ("3.2", "Co-payment", "No co-payment applies to claims for treatment taken at a Network Hospital. A co-payment of 20% of the admissible claim amount applies to treatment taken at a Non-Network Hospital. An additional co-payment of 10% applies where the Insured Person is aged 61 years or above at the time of admission."),
            ("3.3", "Sub-limits", "The following sub-limits apply per policy year and are applied before any co-payment: (a) Cataract surgery: Rs. 40,000 per eye. (b) Treatment of kidney stones: Rs. 60,000 per claim."),
            ("3.4", "Consumables Benefit", "Notwithstanding the list of non-payable items in Annexure II, non-medical items and consumables (including admission kits, gloves, masks and similar items) incurred during a covered hospitalisation are payable under this policy."),
        ]),
        ("Section 4 - Exclusions", [
            ("4.1", "Cosmetic Treatment", "Expenses for cosmetic or aesthetic treatment of any description are not payable, unless required as part of reconstruction following an accident, burn or cancer."),
            ("4.2", "Pre-existing Diseases", "Expenses related to a pre-existing disease have a waiting period of 36 months of continuous coverage since the first policy with the Company, and are not payable during this period."),
            ("4.3", "Specified Disease Waiting Period", "Treatment of hernia, cataract and joint replacement has a waiting period of 24 months of continuous coverage and is not payable during this period, unless necessitated by an accident."),
            ("4.4", "Personal Comfort Items", "Personal comfort and convenience items, including attendant food, television charges, telephone charges and toiletries, are not payable."),
        ]),
        ("Section 5 - Claims", [
            ("5.1", "Cashless Claims", "Cashless facility is available at Network Hospitals subject to pre-authorisation by the TPA. The final settlement will be made on the itemised final hospital bill."),
            ("5.2", "Grievances", "If the Insured Person is not satisfied with a claim decision, a written grievance may be filed with the Company's Grievance Redressal Officer within 30 days of the decision. Unresolved grievances may be escalated to the Insurance Ombudsman."),
        ]),
    ],
}

BILL = {
    "file": "01_hospital_final_bill_aarogya.pdf",
    "policy": "NIRAMAYA",
    "hospital": HOSPITAL,
    "address": ADDRESS,
    "header": {
        "Bill No": "AMH/IP/26/20417", "Bill Date": "2026-09-24",
        "Patient Name": PATIENT, "Age / Sex": "41 / F",
        "UHID": UHID, "Policy No": POLICY_NO,
        "Insurer / TPA": "Sahyadri General / CareLink", "Network Hospital": "Yes",
        "Admission": "2026-09-21", "Discharge": "2026-09-24",
        "Diagnosis": "Acute appendicitis", "Procedure": "Laparoscopic appendectomy",
    },
    "lines": [
        ("2026-09-21", "RM-TWN", "Room charges - Twin sharing", "Room", 4, 4200, None),
        ("2026-09-21", "CON-SPL", "Specialist consultation (General Surgery)", "Consultation", 3, 1500, None),
        ("2026-09-21", "LAB-CBC", "Complete blood count (CBC)", "Laboratory", 1, 450, None),
        ("2026-09-21", "LAB-CRP", "C-reactive protein (CRP)", "Laboratory", 1, 700, None),
        ("2026-09-21", "LAB-CRP", "C-reactive protein (CRP)", "Laboratory", 1, 700, None),
        ("2026-09-21", "RAD-USG", "USG abdomen", "Radiology", 1, 1800, None),
        ("2026-09-22", "OT-LAP-APP", "Laparoscopic appendectomy - surgeon fee", "Surgery", 1, 58000, None),
        ("2026-09-22", "OT-CHG", "Operation theatre charges", "Operation Theatre", 1, 19500, None),
        ("2026-09-22", "ANS-GA-4", "Anaesthesia - General, complex (Grade IV)", "Anaesthesia", 1, 23000, None),
        ("2026-09-22", "PH-CEF1G", "Inj. Ceftriaxone 1g", "Pharmacy", 8, 180, 2160),
        ("2026-09-22", "PH-PCM-IV", "Inj. Paracetamol 1g IV", "Pharmacy", 4, 120, None),
        ("2026-09-22", "CS-KIT", "Surgical consumables kit", "Consumables", 1, 3400, None),
        ("2026-09-22", "NM-PPE", "Gloves and masks pack", "Non-Medical", 1, 1150, None),
        ("2026-09-23", "NM-ATF", "Attendant food", "Non-Medical", 3, 300, None),
    ],
    "gross_override": None,
    "deductions": [
        ("Non-payable items", "Gloves and masks pack; Attendant food", "NONPAY"),
        ("Co-payment", "20% of admissible amount", ("COPAY", 20)),
    ],
}

EXPECTED = {
    "bill": BILL["file"],
    "policy": POLICY["file"],
    "findings": [
        {"type": "QUANTITY_MISMATCH", "lines": [1], "confidence": "High"},
        {"type": "DUPLICATE_CHARGE", "lines": [4, 5], "confidence": "High"},
        {"type": "ARITHMETIC_ERROR", "lines": [10], "confidence": "High"},
        {"type": "UPCODING_SIGNAL", "lines": [9], "confidence": "Worth reviewing"},
        {"type": "COVERAGE_MISMATCH", "lines": [13], "confidence": "High", "topic": "non_medical"},
        {"type": "COVERAGE_MISMATCH", "lines": [], "confidence": "High", "topic": "copay"},
    ],
}


# --------------------------------------------------------------------------------------
# Supporting documents (plain layouts; wording chosen so the document checker can tell
# them apart: each matches its own type's indicators and avoids the others')
# --------------------------------------------------------------------------------------


def _doc(filename: str, title: str, story: list) -> Path:
    path = OUT / filename
    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm,
                            bottomMargin=18 * mm, title=title, author=HOSPITAL)
    doc.build(story, onFirstPage=watermark, onLaterPages=watermark)
    return path


def _kv(rows: list[tuple[str, str]], widths=(48, 126)) -> Table:
    t = Table([[k, Paragraph(v, CELL)] for k, v in rows], colWidths=[widths[0] * mm, widths[1] * mm])
    t.setStyle(GRID)
    t.setStyle(TableStyle([("FONT", (0, 0), (0, -1), "Helvetica-Bold", 8.3)]))
    return t


def _letterhead(subtitle: str) -> list:
    return [Paragraph(HOSPITAL, H1), Paragraph(ADDRESS, SMALL), Paragraph(subtitle, H2)]


def discharge_summary() -> Path:
    story = _letterhead("DISCHARGE SUMMARY") + [
        _kv([
            ("Patient Name", PATIENT), ("Age / Sex", "41 years / Female"), ("UHID", UHID),
            ("Date of Admission", "21-Sep-2026"), ("Date of Discharge", "24-Sep-2026"),
            ("Consultant", "Dr. Arvind Rao, MS (General Surgery)"),
        ]),
        Spacer(1, 8),
        Paragraph("<b>Discharge Diagnosis</b>", BODY), Paragraph("Acute appendicitis, uncomplicated.", BODY), Spacer(1, 4),
        Paragraph("<b>Presenting complaints</b>", BODY),
        Paragraph("Pain in the right lower abdomen for one day with nausea and low-grade fever.", BODY), Spacer(1, 4),
        Paragraph("<b>Operation performed</b>", BODY),
        Paragraph("Laparoscopic appendectomy on 22-Sep-2026 under general anaesthesia. Intra-operative finding: inflamed, "
                  "non-perforated appendix. No complications were noted during the procedure.", BODY), Spacer(1, 4),
        Paragraph("<b>Course in hospital</b>", BODY),
        Paragraph("Post-operative recovery was uneventful. The patient was started on oral feeds on day one after surgery "
                  "and was mobilised the same day.", BODY), Spacer(1, 4),
        Paragraph("<b>Condition at discharge</b>", BODY), Paragraph("Stable, afebrile, wound healthy, tolerating a normal diet.", BODY), Spacer(1, 4),
        Paragraph("<b>Advice on discharge</b>", BODY),
        Paragraph("Review in the surgical outpatient clinic after seven days for suture removal. Avoid lifting heavy weights for four weeks.", BODY),
        Spacer(1, 14), Paragraph("Dr. Arvind Rao, Consultant Surgeon", BODY),
    ]
    return _doc("02_discharge_summary.pdf", "Discharge summary", story)


def lab_report() -> Path:
    rows = [["Test name", "Result", "Units", "Reference range"],
            ["Total leucocyte count", "14,200", "cells/cumm", "4,000 - 11,000"],
            ["Neutrophils", "82", "percent", "40 - 75"],
            ["Haemoglobin", "12", "g/dL", "12 - 15"],
            ["Platelet count", "2,40,000", "cells/cumm", "1,50,000 - 4,10,000"],
            ["C-reactive protein (CRP)", "48", "mg/L", "below 6"]]
    t = Table(rows, colWidths=[62 * mm, 30 * mm, 30 * mm, 52 * mm])
    t.setStyle(GRID)
    t.setStyle(TableStyle([("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8.3), ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef2f7"))]))
    story = _letterhead("LABORATORY REPORT - INVESTIGATION REPORT") + [
        _kv([("Patient Name", PATIENT), ("UHID", UHID), ("Sample collection date", "21-Sep-2026"), ("Report date", "21-Sep-2026"),
             ("Referred by", "Dr. Arvind Rao")]),
        Spacer(1, 8), Paragraph("Test results", H2), t, Spacer(1, 8),
        Paragraph("<b>Impression:</b> raised leucocyte count with neutrophilia and raised CRP, consistent with an acute inflammatory process.", BODY),
        Spacer(1, 4),
        Paragraph("<b>USG abdomen impression:</b> tubular, non-compressible appendix with surrounding fat stranding, suggestive of acute appendicitis.", BODY),
        Spacer(1, 14), Paragraph("Dr. Kavitha Menon, MD (Pathology)", BODY),
    ]
    return _doc("03_lab_investigation_report.pdf", "Laboratory report", story)


def prescription() -> Path:
    rows = [["Medicine", "Dose", "Instructions", "Duration"],
            ["Tab. Cefuroxime 500 mg", "1 tablet", "Take one tablet two times a day after food", "5 days"],
            ["Tab. Paracetamol 650 mg", "1 tablet", "Take one tablet three times a day if pain or fever", "3 days"],
            ["Tab. Pantoprazole 40 mg", "1 tablet", "Take one tablet daily before breakfast", "5 days"]]
    t = Table([[Paragraph(c, CELL) for c in r] for r in rows], colWidths=[50 * mm, 22 * mm, 78 * mm, 24 * mm])
    t.setStyle(GRID)
    story = _letterhead("PRESCRIPTION - DISCHARGE MEDICATION") + [
        _kv([("Patient", PATIENT), ("Date", "24-Sep-2026"), ("Prescriber:", "Dr. Arvind Rao, MS (General Surgery), Reg. No. KMC-48812 (fictional)")]),
        Spacer(1, 8), Paragraph("<b>Rx</b>", H2), Paragraph("Medication:", BODY), Spacer(1, 2), t, Spacer(1, 14),
        Paragraph("Signature of doctor: Dr. Arvind Rao", BODY),
    ]
    return _doc("04_prescription.pdf", "Prescription", story)


def claim_form() -> Path:
    story = [
        Paragraph(INSURER, H1),
        Paragraph("HEALTH INSURANCE CLAIM FORM - PART A (to be filled by the insured)", H2),
        Paragraph("Claimant details", H2),
        _kv([("Claimant / insured name", PATIENT), ("Policy number", POLICY_NO), ("Claim number", "CL-NHP-26-0098341"),
             ("TPA", TPA), ("Contact", "[Phone] | [Email]")]),
        Spacer(1, 6),
        Paragraph("Details of claim", H2),
        _kv([("Hospital", f"{HOSPITAL}, Bengaluru"), ("Date of admission", "21-Sep-2026"), ("Date of discharge", "24-Sep-2026"),
             ("Ailment", "Acute appendicitis"), ("Claim type", "Cashless (network hospital)"), ("Amount claimed", "Rs. 1,33,540")]),
        Spacer(1, 10),
        Paragraph("I declare that the information given in this form is true and complete to the best of my knowledge.", BODY),
        Spacer(1, 14),
        Paragraph(f"Signature of claimant: {PATIENT} &nbsp;&nbsp;&nbsp; Date: 24-Sep-2026", BODY),
    ]
    return _doc("05_claim_form.pdf", "Claim form", story)


def renewal_schedule() -> Path:
    story = [
        Paragraph(INSURER, H1),
        Paragraph("Niramaya Health Plus - Renewal Policy Schedule", H2),
        _kv([("Policy Number", POLICY_NO), ("Plan", "Niramaya Health Plus - Individual"), ("Insured Person", PATIENT),
             ("Policy Start Date", "01/06/2026"), ("Policy Expiry Date", "31/05/2027"), ("Renewal Date", "01/06/2026"),
             ("Previous policy", "NHP-2025-207731 (01/06/2025 to 31/05/2026)"), ("Sum Insured", "Rs. 5,00,000 per policy year"),
             ("First policy inception", "01/06/2023")]),
        Spacer(1, 8),
        Paragraph("Renewal Terms", H2),
        Paragraph("<b>1.1 Continuity of Cover.</b> This policy is renewed without a break in cover. Continuity of cover is confirmed from 01/06/2023, and waiting periods run from that date.", BODY),
        Spacer(1, 3),
        Paragraph("<b>1.2 Endorsement.</b> The Consumables Benefit add-on is continued at renewal. There is no change to the Sum Insured or to the co-payment terms.", BODY),
        Spacer(1, 4),
        Paragraph("This schedule should be read together with the Niramaya Health Plus policy wording.", SMALL),
    ]
    return _doc("07_policy_renewal_schedule.pdf", "Renewal schedule", story)


def rejection_letter() -> Path:
    story = [
        Paragraph(INSURER, H1), Paragraph("Health Claims Department", SMALL), Spacer(1, 6),
        Paragraph("Claim Rejection Letter", H2),
        _kv([("Date", "02-Oct-2026"), ("Insured", PATIENT), ("Policy number", POLICY_NO), ("Claim number", "CL-NHP-26-0101772"),
             ("Hospital", "Sunbeam Day Surgery Centre, Bengaluru (fictional)"), ("Treatment", "Open inguinal hernia repair with mesh")]),
        Spacer(1, 8),
        Paragraph("Dear Ms. Krishnan,", BODY), Spacer(1, 4),
        Paragraph("We have reviewed the above claim and are unable to settle it for the following reasons.", BODY), Spacer(1, 4),
        Paragraph("1. Hernia repair is not payable during the 24-month specified disease waiting period under Clause 4.3.", BODY), Spacer(1, 4),
        Paragraph("2. Gloves, masks and admission kits are disallowed as non-medical consumables.", BODY), Spacer(1, 4),
        Paragraph("To reconsider the claim, please submit the previous policy schedules.", BODY), Spacer(1, 2),
        Paragraph("Please also provide the itemised consumables bill.", BODY),
        Spacer(1, 4),
        Paragraph("You may write to our Grievance Redressal Officer within 30 days of this letter.", BODY), Spacer(1, 14),
        Paragraph("Claims Manager, Sahyadri General Insurance Ltd. (fictional)", BODY),
    ]
    return _doc("08_claim_rejection_letter.pdf", "Claim rejection letter", story)


def preauth_documents() -> list[Path]:
    rows = [["Component", "Estimated amount (Rs.)"],
            ["Room - Twin sharing, 5 days at Rs. 4,200", "21,000"],
            ["Surgeon and assistant fees", "95,000"],
            ["Knee implant (cemented)", "68,000"],
            ["Operation theatre and anaesthesia", "38,000"],
            ["Medicines, investigations and physiotherapy", "23,000"],
            ["Estimated total", "2,45,000"]]
    t = Table(rows, colWidths=[124 * mm, 50 * mm])
    t.setStyle(GRID)
    t.setStyle(TableStyle([("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8.3), ("FONT", (0, -1), (-1, -1), "Helvetica-Bold", 8.3),
                           ("ALIGN", (1, 0), (1, -1), "RIGHT")]))
    estimate = _doc("09_preauth_hospital_cost_estimate.pdf", "Hospital cost estimate", _letterhead("HOSPITAL COST ESTIMATE FOR PLANNED ADMISSION") + [
        _kv([("Patient", "Ramesh Iyer (fictional), 66 years / Male"), ("Planned procedure", "Total knee replacement, right"),
             ("Planned admission", "12-Nov-2026"), ("Expected stay", "5 nights"), ("Room category", "Twin sharing")]),
        Spacer(1, 8), t, Spacer(1, 6),
        Paragraph("This is an estimate. Final charges depend on the clinical course and the items actually used.", SMALL),
    ])
    advice = _doc("10_preauth_doctor_admission_advice.pdf", "Doctor admission advice", _letterhead("ADMISSION ADVICE") + [
        _kv([("Patient", "Ramesh Iyer (fictional)"), ("Consultant", "Dr. Nandini Shetty, MS (Orthopaedics)"), ("Advice date", "28-Oct-2026")]),
        Spacer(1, 8),
        Paragraph("Clinical findings: advanced osteoarthritis of the right knee with fixed deformity, failed conservative "
                  "management for over a year. Standing X-ray shows loss of joint space.", BODY), Spacer(1, 4),
        Paragraph("Recommendation: admission for elective total knee replacement of the right knee, with an expected hospital stay of five nights.", BODY),
        Spacer(1, 14), Paragraph("Dr. Nandini Shetty", BODY),
    ])
    return [estimate, advice]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    gen.OUT_BILLS = OUT
    gen.OUT_POLICIES = OUT
    written = [gen.build_policy(POLICY)]
    bill_path, settled = gen.build_bill("DEMO-001", BILL)
    written += [bill_path, discharge_summary(), lab_report(), prescription(), claim_form(), renewal_schedule(),
                rejection_letter(), *preauth_documents()]
    EXPECTED["settlement"] = {"gross": settled["gross"], "insurer_approved": settled["approved"], "patient_payable": settled["patient"]}
    (OUT / "expected.json").write_text(json.dumps(EXPECTED, indent=2) + "\n")
    for p in sorted(written):
        print(f"wrote demo-kit/{p.name}")
    print(f"settlement as printed: gross {rs(settled['gross'])}, insurer {rs(settled['approved'])}, patient {rs(settled['patient'])}")


if __name__ == "__main__":
    main()
