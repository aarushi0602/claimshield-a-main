import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), "../../demo-kit");
const kit = (name: string) => resolve(KIT, name);
const expected = JSON.parse(readFileSync(kit("expected.json"), "utf8"));

const MEDICAL = ["01_hospital_final_bill_aarogya.pdf", "02_discharge_summary.pdf", "03_lab_investigation_report.pdf", "04_prescription.pdf", "05_claim_form.pdf"].map(kit);
const INSURANCE = ["06_policy_wording_niramaya_health_plus.pdf", "07_policy_renewal_schedule.pdf"].map(kit);
const POLICY = kit("06_policy_wording_niramaya_health_plus.pdf");

async function snap(page: Page, name: string) {
  if (process.env.SCREENSHOTS) await page.screenshot({ path: resolve(KIT, "screens", `${name}.png`), fullPage: true });
}

test("landing page presents the product and sample cases", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Know what your health insurance/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Interactive sample cases" })).toBeVisible();
  await expect(page.getByText("Sanjeevani Hospital").first()).toBeVisible();
  await snap(page, "01-landing");
});

test("clean sample bill is not over-flagged", async ({ page }) => {
  await page.goto("/#/audit/new");
  await page.getByRole("button", { name: /Sanjeevani Hospital/ }).click();
  await page.getByRole("button", { name: /Run claim audit/ }).click();
  await expect(page).toHaveURL(/#\/cases\/case-/);
  await expect(page.getByText("No discrepancies found by the supported bill checks.")).toBeVisible();
});

test("demo-kit claim bundle: upload, live agents, findings, evidence and letters", async ({ page }) => {
  await page.goto("/#/audit/new");
  const inputs = page.locator('input[type="file"]');
  await inputs.nth(0).setInputFiles(MEDICAL);
  await inputs.nth(1).setInputFiles(INSURANCE);
  await page.getByLabel("How are you claiming?").selectOption("cashless");
  await expect(page.getByText("01_hospital_final_bill_aarogya.pdf").first()).toBeVisible();
  await snap(page, "02-new-audit-uploaded");
  await page.getByRole("button", { name: /Run claim audit/ }).click();

  await expect(page).toHaveURL(/#\/cases\/case-/);
  await expect(page.getByRole("heading", { name: "Checking your claim" })).toBeVisible();
  await expect(page.getByText(/agent trace · live stream/)).toBeVisible();
  await snap(page, "03-audit-in-progress");

  await expect(page.getByText(`${expected.findings.length} items worth disputing`)).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("₹27,448").first()).toBeVisible();
  await expect(page.getByText("Your claim needs a few confirmations")).toBeVisible();
  await snap(page, "04-results");

  for (const title of ["Co-payment applied that the policy doesn't require", "Room charged for more days than the stay", "Covered item deducted as non-payable"]) {
    await expect(page.getByRole("cell", { name: new RegExp(title) })).toBeVisible();
  }
  await page.getByRole("cell", { name: /Co-payment applied that the policy doesn't require/ }).click();
  await page.getByRole("tab", { name: /Policy clause & rule/ }).click();
  const inspector = page.getByRole("region", { name: "Evidence inspector" });
  await expect(inspector.getByText(/No co-payment applies to claims for treatment taken at a Network Hospital/)).toBeVisible();

  await page.getByRole("tab", { name: "To the hospital" }).click();
  await expect(page.getByText(/Request for a corrected final bill/).first()).toBeVisible();
  await page.getByRole("tab", { name: "To the insurer" }).click();
  await expect(page.getByText(/Grievance Redressal Officer, Sahyadri General Insurance/).first()).toBeVisible();
  await snap(page, "05-letters");

  const report = page.getByRole("link", { name: "Reconciliation report", exact: true });
  const href = await report.getAttribute("href");
  const pdf = await page.request.get(href!);
  expect(pdf.ok()).toBeTruthy();
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");

  await page.getByRole("link", { name: "Case history" }).first().click();
  await expect(page.getByRole("heading", { name: "Case history" })).toBeVisible();
  await expect(page.getByText("Aarogya Multispeciality Hospital").first()).toBeVisible();
  await snap(page, "06-case-history");
});

test("document checker recognises every claim document", async ({ page }) => {
  await page.goto("/#/tools/documents");
  await page.locator('input[type="file"]').setInputFiles([...MEDICAL, ...INSURANCE]);
  await page.getByLabel("Claim type").selectOption("cashless");
  await page.getByRole("button", { name: "Check documents" }).click();
  for (const label of ["Hospital bill", "Discharge summary", "Investigation report", "Prescription", "Claim form", "Policy document"]) {
    await expect(page.getByRole("heading", { name: label, exact: true }).first()).toBeVisible();
  }
  await expect(page.getByText(/^Missing$/)).toHaveCount(0);
  await snap(page, "07-document-checker");
});

test("denial support compares a rejection letter with the policy", async ({ page }) => {
  await page.goto("/#/tools/rejection");
  const inputs = page.locator('input[type="file"]');
  await inputs.nth(0).setInputFiles(kit("08_claim_rejection_letter.pdf"));
  await inputs.nth(1).setInputFiles(POLICY);
  await page.getByRole("button", { name: "Analyze rejection" }).click();
  await expect(page.getByText("Potentially inconsistent with policy")).toBeVisible();
  await expect(page.getByText("Insufficient evidence")).toBeVisible();
  await expect(page.getByText(/Appeal or clarification draft/)).toBeVisible();
  await snap(page, "08-denial-support");
});

test("pre-authorization flags the joint replacement waiting period", async ({ page }) => {
  await page.goto("/#/tools/preauth");
  const v = {
    "Patient name": "Ramesh Iyer", Treatment: "Total knee replacement", "Estimated treatment cost (₹)": "245000",
    "Hospital name": "Aarogya Multispeciality Hospital", "Hospital address": "Marathahalli, Bengaluru",
    "Insurer name": "Sahyadri General Insurance Ltd. (fictional)", "Policy number": "NHP-2026-207731",
  };
  for (const [label, value] of Object.entries(v)) await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel("Network status").selectOption("confirmed_network");
  const inputs = page.locator('input[type="file"]');
  await inputs.nth(0).setInputFiles(POLICY);
  await inputs.nth(1).setInputFiles([kit("09_preauth_hospital_cost_estimate.pdf"), kit("10_preauth_doctor_admission_advice.pdf")]);
  for (const doc of ["Hospital cost estimate", "Doctor advice / admission recommendation", "Policy schedule or e-card"]) await page.getByLabel(doc).check();
  await page.getByLabel(/patient has consented/).check();
  await page.getByRole("button", { name: "Prepare request summary" }).click();
  await expect(page.getByText(/coverage restriction/i)).toBeVisible();
  await expect(page.getByText("PRE-AUTHORIZATION PREPARATION SUMMARY", { exact: false })).toBeVisible();
  await snap(page, "09-preauthorization");
});
