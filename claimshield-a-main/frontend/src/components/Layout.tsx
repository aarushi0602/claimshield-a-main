import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import {
  BookOpen, ClipboardCheck, FilePlus2, FileText, FolderClock, GitCompare, Globe, History, Languages,
  LayoutDashboard, Lock, Menu, Scale, Server, ShieldCheck, Stethoscope, UserCheck, X, Calculator,
} from "lucide-react";
import { getJson } from "../lib/api";
import type { Stack } from "../lib/types";
import { cx } from "./ui";

interface NavItem {
  to: string;
  label: string;
  icon: typeof ShieldCheck;
  end?: boolean;
}

const NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Workspace",
    items: [
      { to: "/", label: "Overview", icon: Globe, end: true },
      { to: "/audit/new", label: "New audit", icon: FilePlus2 },
      { to: "/history", label: "Case history", icon: FolderClock },
      { to: "/letters", label: "Dispute letters", icon: FileText },
    ],
  },
  {
    heading: "Claim tools",
    items: [
      { to: "/tools/documents", label: "Document checker", icon: ClipboardCheck },
      { to: "/tools/preauth", label: "Pre-authorization", icon: Stethoscope },
      { to: "/tools/policy-explainer", label: "Policy assistant", icon: Languages },
      { to: "/tools/rejection", label: "Denial support", icon: Scale },
      { to: "/tools/preclaim", label: "Plan treatment", icon: Calculator },
      { to: "/tools/what-if", label: "Compare options", icon: GitCompare },
      { to: "/tools/policy-history", label: "Policy history", icon: History },
    ],
  },
  {
    heading: "Professional",
    items: [
      { to: "/pro/reviewer", label: "Insurer review", icon: UserCheck },
      { to: "/pro/regulatory", label: "Regulatory references", icon: BookOpen },
    ],
  },
];

const ALL_ITEMS = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.heading })));

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-3">
      <span className="grid size-9 place-items-center rounded-lg bg-navy text-white shadow-z1">
        <ShieldCheck className="size-5" aria-hidden />
      </span>
      <span className="leading-tight">
        <span className="block text-headline-sm font-bold text-navy">ClaimShield AI</span>
        <span className="hidden text-label-sm uppercase text-muted sm:block">Claim audit workspace</span>
      </span>
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-5 px-4 py-5">
      <Brand />
      <div className="flex items-center justify-center gap-1.5 rounded-full bg-container px-3 py-1 text-label-sm uppercase text-navy">
        <span className="size-1.5 rounded-full bg-action" aria-hidden /> Demo workspace
      </div>
      <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {NAV.map((group) => (
          <div key={group.heading}>
            <p className="mb-1.5 px-3 text-label-sm uppercase text-muted">{group.heading}</p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cx(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-body-md font-medium transition-colors",
                        isActive ? "bg-navy text-white shadow-z1" : "text-ink hover:bg-container-low",
                      )
                    }
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="rounded-lg border border-line bg-container-low p-3">
        <p className="flex items-center gap-2 text-label-md text-navy">
          <Lock className="size-3.5" aria-hidden /> Private workspace
        </p>
        <p className="mt-1 text-body-sm text-muted">Your documents stay in your authenticated claim workspace.</p>
      </div>
    </div>
  );
}

function ServicesMenu() {
  const [stack, setStack] = useState<Stack | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    getJson<{ stack: Stack }>("/api/health").then((h) => setStack(h.stack)).catch(() => setStack(null));
  }, []);
  if (!stack) return null;
  const cloud = (v: string) => /Document AI|BigQuery|Vertex|Gemini|Cloud Storage/.test(v) && !/local/.test(v);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-label-md text-ink hover:bg-neutral-bg"
      >
        <Server className="size-3.5 text-muted" aria-hidden /> Processing services
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-line bg-surface p-3 shadow-z3">
          <p className="mb-2 text-label-sm uppercase text-muted">Backends used for this workspace</p>
          <ul className="flex flex-col gap-1.5">
            {Object.entries(stack).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between gap-3 text-body-sm">
                <span className="capitalize text-muted">{k}</span>
                <span className={cx("rounded px-2 py-0.5 text-right", cloud(v) ? "bg-teal-soft text-teal" : "bg-neutral-bg text-neutral")}>{v}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-12 border-t border-line px-6 py-6 text-body-sm text-muted">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-navy" aria-hidden />
          ClaimShield AI flags items <em className="not-italic font-semibold text-ink">worth disputing</em>. It does not give legal advice or allege fraud.
        </p>
        <p>Sample cases use synthetic data: patients, hospitals, bills and policies are fictional.</p>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  const current = ALL_ITEMS.find((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to) && i.to !== "/"));
  const crumb = location.pathname.startsWith("/cases/") ? { group: "Workspace", label: "Claim audit" } : current ? { group: current.group, label: current.label } : null;

  useEffect(() => setDrawer(false), [location.pathname]);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 z-30 hidden h-screen w-64 shrink-0 border-r border-line bg-surface xl:block">
        <SidebarContent />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-[rgba(18,43,66,0.45)] backdrop-blur-[4px]" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-surface shadow-z3">
            <button type="button" onClick={() => setDrawer(false)} className="absolute right-3 top-4 rounded p-1 text-muted hover:bg-neutral-bg" aria-label="Close navigation">
              <X className="size-5" />
            </button>
            <SidebarContent onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setDrawer(true)} className="rounded-lg p-2 text-ink hover:bg-neutral-bg xl:hidden" aria-label="Open navigation">
              <Menu className="size-5" />
            </button>
            <span className="xl:hidden"><Brand /></span>
            {crumb && (
              <p className="hidden items-center gap-2 truncate text-label-md text-muted md:flex">
                <LayoutDashboard className="size-3.5" aria-hidden /> {crumb.group}
                <span aria-hidden>/</span>
                <span className="text-ink">{crumb.label}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:block"><ServicesMenu /></span>
            <Link to="/audit/new" aria-label="New audit" className="inline-flex items-center gap-2 rounded-lg bg-action px-3 py-2 text-label-md text-white shadow-z1 hover:bg-action-hover sm:px-4">
              <FilePlus2 className="size-4" aria-hidden /> <span className="hidden sm:inline">New audit</span>
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 lg:py-8">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
