// Ported from tests/test_browser_healthcare.cjs, plus render checks for the results screen.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { HealthcareAuditPanel } from "./Analysis";
import AuditResults from "../AuditResults";
import { deriveSteps } from "../AuditProgress";
import type { CaseRecord, HealthcareAudit } from "../../lib/types";
import demoCase from "../../test/fixtures/demo-case.json";

const fixture = (name: string) => JSON.parse(readFileSync(resolve(__dirname, "../../../../tests/fixtures/healthcare", name), "utf8"));

describe("HealthcareAuditPanel", () => {
  it("shows every financial/status field and source provenance", () => {
    const report = fixture("source_unavailable_output.json") as HealthcareAudit;
    report.findings!.push({
      title: "NPPA check", type: "NPPA_REFERENCE", status: "flagged", severity: "warning",
      billed_amount: 30, reference_amount: 20, potential_difference: 10, confidence: "High", confidence_score: 0.98,
      explanation: "Confirm product and tax basis.",
      evidence: { source: { source_name: "Synthetic source", verification_status: "approved", page_number: 3, effective_date: "2026-01-01", version: "fixture" } },
    });
    render(<HealthcareAuditPanel report={report} />);
    const summary = screen.getByTestId("healthcare-audit-summary").textContent!;
    for (const label of ["Billed total", "Potential adjustment scenario", "Benchmark variance", "Clear checks", "Flagged checks", "Needs review"]) expect(summary).toContain(label);
    const rows = screen.getAllByTestId("healthcare-audit-row");
    const text = rows[rows.length - 1].textContent!;
    for (const field of ["NPPA_REFERENCE", "warning", "₹30", "₹20", "₹10", "0.98", "Confirm product", "Synthetic source", "approved", "Page: 3", "2026-01-01"]) expect(text).toContain(field);
  });

  it("keeps unknown results undetermined, renders source text inert, and hides legacy reports", () => {
    const { container, rerender } = render(
      <HealthcareAuditPanel
        report={{
          finding_counts: { clear: 0, flagged: 0, needs_review: 1 },
          potential_discrepancy: null,
          warnings: ["<script>bad</script>"],
          findings: [{ type: "X", status: "needs_review", potential_difference: 9999, explanation: "<img src=x onerror=bad>", evidence: { source: { source_name: "<script>source</script>" } } }],
        }}
      />,
    );
    const row = screen.getByTestId("healthcare-audit-row");
    expect(row.textContent).toContain("Not determined");
    expect(row.textContent).not.toContain("9,999");
    expect(row.textContent).toContain("<img src=x onerror=bad>");
    expect(container.querySelector("img, script")).toBeNull();
    expect(screen.getByTestId("healthcare-audit-warnings").textContent).toContain("<script>bad</script>");
    rerender(<HealthcareAuditPanel report={undefined} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("AuditResults", () => {
  const record = demoCase as unknown as CaseRecord;
  const view = () => render(<MemoryRouter><AuditResults record={record} /></MemoryRouter>);

  it("summarises recovery and lists every finding in the ledger", () => {
    view();
    expect(screen.getByText(/6 items worth disputing/)).toBeInTheDocument();
    expect(screen.getAllByText("₹27,448").length).toBeGreaterThan(0);
    for (const f of record.findings!) expect(screen.getAllByText(f.title).length).toBeGreaterThan(0);
  });

  it("inspects the selected finding's policy clause", async () => {
    view();
    const user = userEvent.setup();
    await user.click(screen.getAllByText("Room charged for more days than the stay")[0]);
    await user.click(screen.getByRole("tab", { name: /Policy clause & rule/ }));
    expect(screen.getAllByText(/Expenses Actually Incurred/).length).toBeGreaterThan(0);
  });

  it("filters the ledger by finding type", async () => {
    view();
    const user = userEvent.setup();
    const group = screen.getByRole("group", { name: /Filter findings by type/ });
    await user.click(within(group).getByRole("button", { name: /Duplicate charge/ }));
    expect(screen.getByText("1 of 6 findings")).toBeInTheDocument();
  });

  it("shows both dispute letters", () => {
    view();
    expect(screen.getByRole("tab", { name: "To the insurer" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "To the hospital" })).toBeInTheDocument();
  });
});

describe("deriveSteps", () => {
  it("tracks pending, running and done stages, including upload-only agents", () => {
    const steps = deriveSteps([
      { seq: 0, t: 0, agent: "document_agent", kind: "start", message: "Checking documents" },
      { seq: 1, t: 0.1, agent: "document_agent", kind: "result", message: "Document checklist ready" },
      { seq: 2, t: 0.2, agent: "intake_agent", kind: "start", message: "Reading" },
    ]);
    expect(steps[0]).toMatchObject({ agent: "document_agent", state: "done", caption: "Document checklist ready" });
    expect(steps[1]).toMatchObject({ agent: "intake_agent", state: "running" });
    expect(steps.find((s) => s.agent === "dispute_agent")?.state).toBe("pending");
  });

  it("marks running stages as failed when the orchestrator reports an error", () => {
    const steps = deriveSteps([
      { seq: 0, t: 0, agent: "intake_agent", kind: "start", message: "Reading" },
      { seq: 1, t: 1, agent: "orchestrator", kind: "error", message: "Audit failed" },
    ]);
    expect(steps.find((s) => s.agent === "intake_agent")?.state).toBe("error");
  });
});
