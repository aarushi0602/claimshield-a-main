import type { ReactNode } from "react";
import { Card, ErrorBanner, PageHeader, Pill, Quote } from "./ui";

export function ToolPage({ eyebrow, title, description, form, result, error }: { eyebrow: string; title: string; description: ReactNode; form: ReactNode; result?: ReactNode; error?: string | null }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={<Pill>{eyebrow}</Pill>} title={title} description={description} />
      <Card className="p-6">{form}</Card>
      <ErrorBanner message={error} />
      {result && <div className="flex flex-col gap-5" aria-live="polite">{result}</div>}
    </div>
  );
}

export function Section({ title, children, actions }: { title: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <Card className="p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-headline-sm text-ink">{title}</h3>
        {actions}
      </div>
      {children}
    </Card>
  );
}

export function ClauseEvidence({ items }: { items: { clause_id: string; title: string; quote?: string; text?: string; source?: string; page?: number | null }[] }) {
  if (!items.length) return <p className="text-body-sm text-muted">No relevant policy clauses were found in the uploaded policy.</p>;
  return (
    <div className="flex flex-col gap-3">
      {items.map((e, i) => (
        <div key={i}>
          <p className="text-label-md text-ink">Clause {e.clause_id} · {e.title}</p>
          <Quote className="mt-1">{e.quote ?? e.text}</Quote>
          {(e.source || e.page) && <p className="mt-1 text-body-sm text-muted">{e.source}{e.page ? ` · page ${e.page}` : ""}</p>}
        </div>
      ))}
    </div>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1 text-body-md text-ink">
      {items.map((x, i) => <li key={i} className="flex gap-2"><span className="text-action">•</span>{x}</li>)}
    </ul>
  );
}
