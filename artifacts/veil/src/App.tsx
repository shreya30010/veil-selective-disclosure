import { useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Copy,
  Database,
  FileScan,
  FileText,
  Fingerprint,
  Gauge,
  GitBranch,
  Info,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  ScanLine,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  UserRound,
  UsersRound,
  X,
  XCircle,
} from 'lucide-react';
import { Link, Route, Switch, useLocation } from 'wouter';
import {
  EntityType,
  Role,
  getGetAuditLogQueryKey,
  getGetVeilSummaryQueryKey,
  useGetAuditLog,
  useGetDemoDocument,
  useGetVeilSummary,
  useHealthCheck,
  useScanDocument,
  useTestDisclosure,
  useTransformDocument,
  type AuditEvent,
  type DemoDocument,
  type DisclosureResult,
  type RiskBreakdown,
  type ScanResult,
  type SensitiveEntity,
  type TransformResult,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import './index.css';

const queryClient = new QueryClient();

const roleMeta: Record<string, { label: string; short: string; tone: string; description: string }> = {
  PUBLIC: { label: 'Public', short: 'PUB', tone: 'text-slate-600 bg-slate-100 border-slate-200', description: 'Open readership with no privileged context.' },
  REPORTER: { label: 'Reporter', short: 'REP', tone: 'text-cyan-800 bg-cyan-50 border-cyan-200', description: 'Working access for the reporting desk.' },
  EDITOR: { label: 'Editor', short: 'EDT', tone: 'text-amber-800 bg-amber-50 border-amber-200', description: 'Editorial oversight and source protection.' },
  AUTHORIZED_INVESTIGATOR: { label: 'Authorized investigator', short: 'INV', tone: 'text-emerald-800 bg-emerald-50 border-emerald-200', description: 'Full approved access for the case team.' },
};

const typeMeta: Record<string, { label: string; tint: string; marker: string }> = {
  PERSON: { label: 'Person', tint: 'bg-rose-100/80 text-rose-900 border-rose-200', marker: 'bg-rose-200/80' },
  EMAIL: { label: 'Email', tint: 'bg-sky-100/80 text-sky-900 border-sky-200', marker: 'bg-sky-200/80' },
  PHONE: { label: 'Phone', tint: 'bg-sky-100/80 text-sky-900 border-sky-200', marker: 'bg-sky-200/80' },
  LOCATION: { label: 'Location', tint: 'bg-amber-100/80 text-amber-900 border-amber-200', marker: 'bg-amber-200/80' },
  ORGANIZATION: { label: 'Organization', tint: 'bg-violet-100/80 text-violet-900 border-violet-200', marker: 'bg-violet-200/80' },
  FINANCIAL: { label: 'Financial', tint: 'bg-orange-100/80 text-orange-900 border-orange-200', marker: 'bg-orange-200/80' },
  CONFIDENTIAL_SOURCE: { label: 'Confidential source', tint: 'bg-emerald-100/80 text-emerald-900 border-emerald-200', marker: 'bg-emerald-200/80' },
};

const severityMeta: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'bg-slate-100 text-slate-600' },
  MEDIUM: { label: 'Medium', color: 'bg-amber-100 text-amber-800' },
  HIGH: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  CRITICAL: { label: 'Critical', color: 'bg-rose-100 text-rose-800' },
};

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/scan', label: 'Scan document', icon: ScanLine },
  { href: '/lens', label: 'Disclosure Lens', icon: Network },
  { href: '/audit', label: 'Audit log', icon: ScrollText },
];

function classNames(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function formatTime(value?: string | null) {
  if (!value) return 'Not yet scanned';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

function exposureTone(score = 0) {
  if (score >= 75) return { label: 'High exposure', color: 'text-rose-700', bar: 'bg-rose-500', soft: 'bg-rose-50 border-rose-200' };
  if (score >= 45) return { label: 'Moderate exposure', color: 'text-amber-700', bar: 'bg-amber-500', soft: 'bg-amber-50 border-amber-200' };
  return { label: 'Low exposure', color: 'text-emerald-700', bar: 'bg-emerald-500', soft: 'bg-emerald-50 border-emerald-200' };
}

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = navItems.find((item) => item.href === location) ?? navItems[0];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <aside className={classNames(
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width,transform] duration-300',
        collapsed ? 'w-[76px]' : 'w-[252px]',
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      )}>
        <div className="flex h-[76px] items-center gap-3 border-b border-sidebar-border px-5">
          <div className="relative grid size-9 shrink-0 place-items-center rounded-[11px] bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_0_0_4px_hsl(var(--sidebar-primary)/.12)]">
            <ShieldCheck size={19} strokeWidth={2.2} />
            <span className="absolute -right-1 -top-1 size-2 rounded-full bg-accent ring-2 ring-sidebar" />
          </div>
          {!collapsed && <div className="leading-none"><div className="font-mono text-[15px] font-medium tracking-[.18em] text-white">VEIL</div><div className="mt-1 text-[10px] uppercase tracking-[.18em] text-sidebar-foreground/55">Disclosure console</div></div>}
        </div>
        <div className={classNames('px-3 pt-7', collapsed && 'px-2')}>
          {!collapsed && <div className="mb-3 px-3 font-mono text-[9px] uppercase tracking-[.18em] text-sidebar-foreground/45">Workspace</div>}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location === item.href;
              return (
                <Link
                  href={item.href}
                  key={item.href}
                  onClick={() => setMobileOpen(false)}
                  data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`}
                  className={classNames(
                    'group flex h-11 items-center gap-3 rounded-[9px] px-3 text-sm transition-colors',
                    active ? 'bg-sidebar-accent text-white shadow-[inset_3px_0_0_hsl(var(--sidebar-primary))]' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-white',
                    collapsed && 'justify-center px-0',
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                  {!collapsed && <span>{item.label}</span>}
                  {!collapsed && item.href === '/lens' && <span className="ml-auto rounded-full bg-sidebar-primary/15 px-1.5 py-0.5 font-mono text-[9px] text-sidebar-primary">LIVE</span>}
                </Link>
              );
            })}
          </nav>
        </div>
        {!collapsed && (
          <div className="mt-auto p-4">
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3.5">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-white"><LockKeyhole size={13} className="text-sidebar-primary" /> Privacy posture</div>
              <p className="mt-2 text-[11px] leading-5 text-sidebar-foreground/55">Disclosure rules are active. Every attempt is recorded without storing raw values.</p>
              <div className="mt-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-sidebar-primary"><span className="size-1.5 rounded-full bg-sidebar-primary" /> Policy engine online</div>
            </div>
            <div className="mt-4 flex items-center gap-2 px-2 text-[10px] text-sidebar-foreground/38"><CircleHelp size={13} /> v0.9 · newsroom sandbox</div>
          </div>
        )}
      </aside>

      <div className={classNames('min-h-[100dvh] transition-[padding] duration-300', collapsed ? 'md:pl-[76px]' : 'md:pl-[252px]')}>
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-border/75 bg-background/90 px-4 backdrop-blur-md sm:px-7">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMobileOpen(!mobileOpen)} className="grid size-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground md:hidden" data-testid="button-open-mobile-nav" aria-label="Open navigation"><Menu size={17} /></button>
            <button type="button" onClick={() => setCollapsed(!collapsed)} className="hidden size-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground md:grid" data-testid="button-toggle-sidebar" aria-label="Toggle sidebar">{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button>
            <div className="hidden h-5 w-px bg-border sm:block" />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">VEIL / workspace</div>
              <div className="mt-1 text-sm font-semibold tracking-tight">{current.label}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-muted-foreground sm:flex"><span className="size-1.5 rounded-full bg-emerald-500" /> Encrypted session</div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3">
              <div className="grid size-7 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">RS</div>
              <span className="hidden text-xs font-semibold sm:block">Rina Shah</span>
              <ChevronDown size={13} className="text-muted-foreground" />
            </div>
          </div>
        </header>
        {mobileOpen && <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" data-testid="button-close-mobile-overlay" className="fixed inset-0 z-30 bg-slate-950/25 md:hidden" />}
        <main className="veil-grid min-h-[calc(100dvh-76px)]">{children}</main>
      </div>
    </div>
  );
}

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 border-b border-border/75 px-5 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-11 lg:py-10">
      <div className="max-w-2xl">
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.18em] text-primary"><span className="size-1.5 rounded-full bg-primary" /> {eyebrow}</div>
        <h1 className="font-serif text-4xl leading-[.96] tracking-[-.03em] text-slate-900 sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={classNames('scan-skeleton rounded-lg', className)} aria-label="Loading" data-testid="loading-skeleton" />;
}

function EmptyState({ icon: Icon, title, message, action }: { icon: typeof FileText; title: string; message: string; action?: ReactNode }) {
  return <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/65 p-8 text-center"><div className="mb-4 grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><Icon size={21} /></div><h3 className="font-serif text-xl">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{message}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

function ErrorState({ message = 'The policy service could not be reached.', onRetry }: { message?: string; onRetry?: () => void }) {
  return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900"><div className="flex items-start gap-3"><AlertCircle size={19} className="mt-0.5 shrink-0" /><div><div className="text-sm font-semibold">Something needs attention</div><p className="mt-1 text-sm text-rose-800/75">{message}</p>{onRetry && <button type="button" onClick={onRetry} data-testid="button-retry-request" className="mt-3 inline-flex items-center gap-2 rounded-md border border-rose-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-rose-100"><RefreshCw size={13} /> Try again</button>}</div></div></div>;
}

function StatusChip({ role }: { role: string }) {
  const meta = roleMeta[role] ?? roleMeta.PUBLIC;
  return <span className={classNames('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide', meta.tone)}><span className="size-1.5 rounded-full bg-current opacity-70" />{meta.label}</span>;
}

function Dashboard() {
  const summaryQuery = useGetVeilSummary();
  const auditQuery = useGetAuditLog();
  const healthQuery = useHealthCheck();
  const [, navigate] = useLocation();
  const summary = summaryQuery.data;
  const audit = auditQuery.data ?? [];
  const exposure = exposureTone(summary?.exposureScore ?? 0);

  return (
    <div className="veil-page-enter">
      <PageIntro eyebrow="Workspace overview" title="Keep the truth. Control the exposure." description="VEIL maps sensitive entities inside a document, then shows each reader exactly what their role permits." action={<button type="button" onClick={() => navigate('/scan')} data-testid="button-start-scan" className="group inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_7px_18px_hsl(var(--primary)/.16)] transition-transform hover:-translate-y-0.5">Open Disclosure Lens <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /></button>} />
      <div className="space-y-6 px-5 py-7 sm:px-8 lg:px-11 lg:py-9">
        {summaryQuery.isError && <ErrorState message="Summary is unavailable right now. The rest of the workspace remains usable." onRetry={() => summaryQuery.refetch()} />}
        <section className="grid gap-4 lg:grid-cols-[1.35fr_.8fr_.8fr]">
          <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-sidebar p-6 text-white shadow-[0_18px_45px_rgba(23,33,49,.14)] sm:p-7">
            <div className="absolute -right-16 -top-20 size-64 rounded-full border border-sidebar-primary/20" /><div className="absolute -right-5 -top-9 size-44 rounded-full border border-sidebar-primary/15" />
            <div className="relative flex items-start justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-sidebar-primary">Current exposure</div><div className="mt-5 flex items-end gap-3">{summaryQuery.isLoading ? <SkeletonBlock className="h-14 w-28 bg-sidebar-accent" /> : <span className="font-mono text-6xl leading-none tracking-[-.08em] text-white">{summary?.exposureScore ?? '—'}</span>}<span className="pb-1 font-mono text-xs text-sidebar-foreground/50">/ 100</span></div></div><div className="grid size-12 place-items-center rounded-xl border border-white/10 bg-white/5"><Gauge size={22} className="text-sidebar-primary" /></div></div>
            <div className="relative mt-7 h-2 overflow-hidden rounded-full bg-white/10"><div className={classNames('h-full rounded-full transition-all', exposure.bar)} style={{ width: `${summary?.exposureScore ?? 0}%` }} /></div>
            <div className="relative mt-3 flex items-center justify-between"><span className={classNames('text-sm font-semibold', summary ? exposure.color.replace('text-', 'text-') : 'text-white')}>{summary?.exposureLabel ?? 'Awaiting first scan'}</span><span className="font-mono text-[10px] uppercase tracking-wider text-sidebar-foreground/50">live posture</span></div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center justify-between"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Active role</div><UserRound size={17} className="text-primary" /></div><div className="mt-7">{summaryQuery.isLoading ? <SkeletonBlock className="h-7 w-32" /> : <StatusChip role={summary?.currentRole ?? 'PUBLIC'} />}</div><p className="mt-3 text-sm leading-6 text-muted-foreground">{roleMeta[summary?.currentRole ?? 'PUBLIC']?.description}</p><Link href="/lens" data-testid="link-adjust-role" className="mt-7 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">Adjust in Disclosure Lens <ArrowRight size={13} /></Link></div>
          <div className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center justify-between"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Workspace signals</div><Activity size={17} className="text-primary" /></div><div className="mt-5 grid grid-cols-2 gap-4"><div><div className="font-mono text-2xl tracking-tight">{summaryQuery.isLoading ? '—' : summary?.entityCount ?? 0}</div><div className="mt-1 text-xs text-muted-foreground">entities mapped</div></div><div><div className="font-mono text-2xl tracking-tight">{summaryQuery.isLoading ? '—' : summary?.eventCount ?? 0}</div><div className="mt-1 text-xs text-muted-foreground">audit events</div></div></div><div className="mt-6 border-t border-border pt-4"><div className="text-[11px] text-muted-foreground">Last scan</div><div className="mt-1 text-sm font-semibold">{formatTime(summary?.lastScanAt)}</div></div></div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Entry point</div><h2 className="mt-1 font-serif text-2xl">One document. Four accountable views.</h2></div><div className="hidden rounded-lg bg-secondary p-2 text-primary sm:block"><GitBranch size={19} /></div></div>
            <div className="grid gap-0 md:grid-cols-[1.1fr_.9fr]">
              <div className="p-5 sm:p-6"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><FileScan size={19} /></div><div><div className="text-sm font-semibold">The city contract</div><div className="text-xs text-muted-foreground">Fictional investigation · ready to inspect</div></div></div><p className="mt-5 text-sm leading-6 text-muted-foreground">Start with a scan to map people, places, contact details, finances, and source exposure before anyone sees the working copy.</p><Link href="/scan" data-testid="link-scan-demo-document" className="mt-5 inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10">Scan the demo document <ArrowRight size={14} /></Link></div>
              <div className="border-t border-border bg-secondary/45 p-5 md:border-l md:border-t-0 sm:p-6"><div className="font-mono text-[10px] uppercase tracking-[.17em] text-muted-foreground">Policy path</div><div className="mt-4 space-y-3">{['Map sensitive entities', 'Select reader role', 'Test disclosure safely'].map((step, index) => <div className="flex items-center gap-3" key={step}><span className="grid size-6 place-items-center rounded-full border border-primary/25 font-mono text-[10px] text-primary">{index + 1}</span><span className="text-xs font-semibold">{step}</span></div>)}</div><div className="mt-5 flex items-center gap-2 text-[11px] text-muted-foreground"><LockKeyhole size={13} className="text-primary" /> Values stay out of audit logs</div></div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">System status</div><h2 className="mt-1 font-serif text-2xl">Quietly watching.</h2></div><div className={classNames('size-2 rounded-full', healthQuery.data?.status === 'ok' ? 'bg-emerald-500' : healthQuery.isLoading ? 'bg-amber-400 animate-pulse' : 'bg-rose-500')} /></div>
            <div className="space-y-1 p-4"><div className="flex items-center justify-between rounded-lg p-3 hover:bg-secondary"><div className="flex items-center gap-3"><Database size={16} className="text-muted-foreground" /><span className="text-xs font-medium">Policy engine</span></div><span className="font-mono text-[10px] text-emerald-700">OPERATIONAL</span></div><div className="flex items-center justify-between rounded-lg p-3 hover:bg-secondary"><div className="flex items-center gap-3"><KeyRound size={16} className="text-muted-foreground" /><span className="text-xs font-medium">Session encryption</span></div><span className="font-mono text-[10px] text-emerald-700">ACTIVE</span></div><div className="flex items-center justify-between rounded-lg p-3 hover:bg-secondary"><div className="flex items-center gap-3"><ScrollText size={16} className="text-muted-foreground" /><span className="text-xs font-medium">Audit retention</span></div><span className="font-mono text-[10px] text-muted-foreground">30 DAYS</span></div></div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Recent activity</div><h2 className="mt-1 font-serif text-2xl">A record of every decision.</h2></div><Link href="/audit" data-testid="link-view-audit" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">View full audit <ArrowRight size={13} /></Link></div>
          {auditQuery.isLoading ? <div className="space-y-3 p-6"><SkeletonBlock className="h-10 w-full" /><SkeletonBlock className="h-10 w-full" /><SkeletonBlock className="h-10 w-full" /></div> : audit.length === 0 ? <div className="p-6"><EmptyState icon={ScrollText} title="No disclosure decisions yet" message="Test a role in the Disclosure Lens and the decision will appear here without exposing the value." /></div> : <div className="divide-y divide-border">{audit.slice(0, 4).map((event) => <AuditRow event={event} key={event.id} />)}</div>}
        </section>
      </div>
    </div>
  );
}

function AuditRow({ event }: { event: AuditEvent }) {
  const allowed = event.result.toLowerCase().includes('allow') || event.result.toLowerCase().includes('approved');
  return <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="flex items-center gap-3"><div className={classNames('grid size-8 shrink-0 place-items-center rounded-full', allowed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>{allowed ? <Check size={15} /> : <X size={15} />}</div><div><div className="text-sm font-semibold">{event.action}</div><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><StatusChip role={event.role} /><span>·</span><span>{typeMeta[event.resource]?.label ?? event.resource}</span></div></div></div><div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground sm:text-right"><div className={allowed ? 'text-emerald-700' : 'text-rose-700'}>{allowed ? 'Allowed' : 'Blocked'}</div><div className="mt-1">{formatTime(event.time)}</div></div></div>;
}

function ScanPage() {
  const demoQuery = useGetDemoDocument();
  const scanMutation = useScanDocument();
  const [text, setText] = useState('');
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [hasLoadedDemo, setHasLoadedDemo] = useState(false);

  const loadDemo = () => {
    if (demoQuery.data) { setText(demoQuery.data.text); setHasLoadedDemo(true); }
  };
  const runScan = () => { if (text.trim()) scanMutation.mutate({ data: { text } }, { onSuccess: setScan }); };

  return <div className="veil-page-enter"><PageIntro eyebrow="Document intelligence" title="Find the sensitive threads." description="Paste working text or load the fictional city contract. VEIL will map exposure without changing the source." action={<div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground"><span className="size-1.5 rounded-full bg-emerald-500" /> Local draft · not published</div>} />
    <div className="grid gap-6 px-5 py-7 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:px-11 lg:py-9">
      <section className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Source text</div><h2 className="mt-1 font-serif text-2xl">Working copy</h2></div><button type="button" onClick={loadDemo} disabled={demoQuery.isLoading || !demoQuery.data} data-testid="button-load-demo" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"><BookOpen size={13} /> {demoQuery.isLoading ? 'Loading…' : 'Load demo'}</button></div>
        <div className="p-5 sm:p-6"><input value={hasLoadedDemo && demoQuery.data ? demoQuery.data.title : ''} readOnly={hasLoadedDemo} onChange={() => undefined} placeholder="Document title" data-testid="input-document-title" className="mb-3 w-full border-0 border-b border-border bg-transparent pb-3 text-sm font-semibold outline-none placeholder:text-muted-foreground/60 focus:border-primary" /><textarea value={text} onChange={(event) => { setText(event.target.value); setHasLoadedDemo(false); }} data-testid="textarea-document-text" placeholder={demoQuery.isError ? 'Paste a document excerpt here…' : 'Paste a document excerpt here, or load the fictional demo…'} className="veil-scrollbar min-h-[370px] w-full resize-y rounded-xl border border-border bg-background/75 p-4 font-mono text-[12px] leading-6 text-slate-700 outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary focus:ring-2 focus:ring-primary/10" /><div className="mt-4 flex items-center justify-between gap-3"><span className="font-mono text-[10px] text-muted-foreground">{text.length.toLocaleString()} characters</span><button type="button" onClick={runScan} disabled={!text.trim() || scanMutation.isPending} data-testid="button-run-scan" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">{scanMutation.isPending ? <><RefreshCw size={14} className="animate-spin" /> Mapping entities…</> : <><ScanLine size={14} /> Scan document</>}</button></div>{scanMutation.isError && <p className="mt-3 flex items-center gap-2 text-xs text-rose-700"><AlertCircle size={13} /> Scan failed. Check the text and try again.</p>}</div>
      </section>
      <section className="space-y-6">
        {!scan && <EmptyState icon={ScanLine} title="Your map will appear here" message="Run a scan to see sensitive entities, exposure score, and the categories that need an accountable view." />}
        {scan && <ScanResultPanel scan={scan} />}
      </section>
    </div>
  </div>;
}

function HighlightedText({ text, entities }: { text: string; entities: SensitiveEntity[] }) {
  const parts = useMemo(() => {
    const sorted = [...entities].sort((a, b) => a.start - b.start);
    const result: ReactNode[] = [];
    let cursor = 0;
    sorted.forEach((entity) => {
      if (entity.start < cursor || entity.start >= text.length) return;
      result.push(<span key={`plain-${entity.id}`} className="whitespace-pre-wrap">{text.slice(cursor, entity.start)}</span>);
      const meta = typeMeta[entity.type] ?? typeMeta.PERSON;
      result.push(<span key={entity.id} title={`${meta.label} · ${severityMeta[entity.severity]?.label ?? entity.severity}`} className={classNames('sensitive-mark whitespace-pre-wrap', meta.marker, entity.severity === 'CRITICAL' && 'ring-1 ring-rose-400')}>{text.slice(entity.start, Math.min(entity.end, text.length))}</span>);
      cursor = Math.min(entity.end, text.length);
    });
    result.push(<span key="plain-end" className="whitespace-pre-wrap">{text.slice(cursor)}</span>);
    return result;
  }, [entities, text]);
  return <div className="font-mono text-[12px] leading-7 text-slate-700">{parts}</div>;
}

function ScanResultPanel({ scan }: { scan: ScanResult }) {
  const exposure = exposureTone(scan.exposureScore);
  return <div className="space-y-6">
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Scan result · {formatTime(scan.scannedAt)}</div><h2 className="mt-1 font-serif text-2xl">Entity map</h2></div><div className={classNames('flex items-center gap-2 rounded-lg border px-3 py-2', exposure.soft)}><div className={classNames('font-mono text-2xl tracking-tight', exposure.color)}>{scan.exposureScore}</div><div><div className={classNames('text-xs font-semibold', exposure.color)}>{scan.exposureLabel}</div><div className="text-[10px] text-muted-foreground">exposure score</div></div></div></div>
      <div className="p-5 sm:p-6"><div className="veil-scrollbar max-h-[330px] overflow-auto rounded-xl border border-border bg-[#f8fafb] p-4 sm:p-5"><HighlightedText text={scan.text} entities={scan.entities} /></div><div className="mt-4 flex flex-wrap gap-2">{Object.entries(typeMeta).filter(([type]) => scan.entities.some((entity) => entity.type === type)).map(([type, meta]) => <span key={type} className={classNames('rounded-full border px-2 py-1 text-[10px] font-semibold', meta.tint)}>{meta.label} <span className="ml-1 opacity-60">{scan.entities.filter((entity) => entity.type === type).length}</span></span>)}</div></div>
    </div>
    <RiskBreakdownPanel risks={scan.risks} />
  </div>;
}

function RiskBreakdownPanel({ risks }: { risks: RiskBreakdown }) {
  const rows = [{ key: 'identity', label: 'Identity', icon: Fingerprint }, { key: 'location', label: 'Location', icon: Network }, { key: 'contact', label: 'Contact', icon: Activity }, { key: 'financial', label: 'Financial', icon: TerminalSquare }, { key: 'sourceExposure', label: 'Source exposure', icon: ShieldAlert }];
  return <div className="rounded-2xl border border-border bg-card"><div className="border-b border-border px-5 py-4 sm:px-6"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Risk breakdown</div><h2 className="mt-1 font-serif text-2xl">Where exposure gathers.</h2></div><div className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">{rows.map(({ key, label, icon: Icon }) => { const value = risks[key as keyof RiskBreakdown]; const tone = exposureTone(value); return <div key={key}><div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-semibold"><Icon size={14} className="text-muted-foreground" />{label}</div><span className={classNames('font-mono text-xs', tone.color)}>{value}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className={classNames('h-full rounded-full', tone.bar)} style={{ width: `${value}%` }} /></div></div>; })}</div></div>;
}

function LensPage() {
  const demoQuery = useGetDemoDocument();
  const scanMutation = useScanDocument();
  const disclosureMutation = useTestDisclosure();
  const transformMutation = useTransformDocument();
  const client = useQueryClient();
  const [role, setRole] = useState<typeof Role[keyof typeof Role]>(Role.PUBLIC);
  const [resource, setResource] = useState<typeof EntityType[keyof typeof EntityType]>(EntityType.CONFIDENTIAL_SOURCE);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [transformed, setTransformed] = useState<TransformResult | null>(null);
  const [result, setResult] = useState<DisclosureResult | null>(null);

  const scanDemo = () => {
    if (demoQuery.data) {
      scanMutation.mutate(
        { data: { text: demoQuery.data.text } },
        {
          onSuccess: (data) => {
            setScan(data);
            setTransformed(null);
            transformMutation.mutate(
              { data: { text: data.text, role } },
              { onSuccess: setTransformed },
            );
          },
        },
      );
    }
  };
  const testDisclosure = () => disclosureMutation.mutate({ data: { role, resource } }, { onSuccess: (data) => { setResult(data); client.invalidateQueries({ queryKey: getGetAuditLogQueryKey() }); client.invalidateQueries({ queryKey: getGetVeilSummaryQueryKey() }); } });

  return <div className="veil-page-enter"><PageIntro eyebrow="Role-aware reading" title="Change the lens. Not the truth." description="Choose who is reading the same source. VEIL applies policy in place, so the record stays accountable at every level." action={<div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[.13em] text-primary"><Sparkles size={13} /> Policy simulation</div>} />
    <div className="grid gap-6 px-5 py-7 sm:px-8 lg:grid-cols-[.78fr_1.22fr] lg:px-11 lg:py-9">
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">01 / Reader role</div><h2 className="mt-1 font-serif text-2xl">Who is looking?</h2></div>
           <div className="space-y-2 p-4">{Object.entries(roleMeta).map(([key, meta]) => <button type="button" key={key} onClick={() => { const nextRole = Role[key as keyof typeof Role]; setRole(nextRole); setResult(null); setTransformed(null); if (scan) transformMutation.mutate({ data: { text: scan.text, role: nextRole } }, { onSuccess: setTransformed }); }} data-testid={`button-role-${key.toLowerCase()}`} className={classNames('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all', role === Role[key as keyof typeof Role] ? 'border-primary bg-primary/5 shadow-[inset_3px_0_0_hsl(var(--primary))]' : 'border-transparent hover:border-border hover:bg-secondary')}><div className={classNames('grid size-9 shrink-0 place-items-center rounded-lg font-mono text-[10px] font-semibold', role === Role[key as keyof typeof Role] ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>{meta.short}</div><div className="min-w-0"><div className="text-xs font-semibold">{meta.label}</div><div className="mt-0.5 truncate text-[11px] text-muted-foreground">{meta.description}</div></div>{role === Role[key as keyof typeof Role] && <CheckCircle2 size={16} className="ml-auto shrink-0 text-primary" />}</button>)}</div>
        </section>
        <section className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">02 / Disclosure test</div><h2 className="mt-1 font-serif text-2xl">Ask before revealing.</h2></div>
          <div className="p-5"><label htmlFor="resource-select" className="text-xs font-semibold">Protected resource</label><div className="relative mt-2"><select id="resource-select" value={resource} onChange={(event) => { setResource(event.target.value as typeof resource); setResult(null); }} data-testid="select-disclosure-resource" className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-3 pr-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">{Object.entries(typeMeta).map(([key, meta]) => <option value={key} key={key}>{meta.label}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-3.5 text-muted-foreground" /></div><button type="button" onClick={testDisclosure} disabled={disclosureMutation.isPending} data-testid="button-test-disclosure" className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50">{disclosureMutation.isPending ? <><RefreshCw size={14} className="animate-spin" /> Checking policy…</> : <><ShieldCheck size={14} /> Test disclosure</>}</button>{result && <DisclosureFeedback result={result} />}</div>
        </section>
      </div>
      <section className="rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">03 / Transformed document</div><h2 className="mt-1 font-serif text-2xl">The same record, {roleMeta[role]?.label.toLowerCase()} view.</h2></div>{!scan && <button type="button" onClick={scanDemo} disabled={demoQuery.isLoading || !demoQuery.data || scanMutation.isPending} data-testid="button-load-lens-document" className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50">{scanMutation.isPending ? <RefreshCw size={13} className="animate-spin" /> : <FileScan size={13} />} {scanMutation.isPending ? 'Preparing…' : 'Load demo view'}</button>}</div>
         {scan ? <div className="p-5 sm:p-6"><div className="mb-4 flex flex-wrap items-center gap-2"><StatusChip role={role} /><span className="text-xs text-muted-foreground">Policy applied in place · sensitive values are masked where required</span></div><PolicyDocument scan={scan} role={role} transformed={transformed} transforming={transformMutation.isPending} /><div className="mt-5 flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-3 py-3 text-xs text-muted-foreground"><Info size={14} className="shrink-0 text-primary" /> Disclosure tests are logged as category decisions, never as raw values.</div></div> : <div className="p-5 sm:p-6"><EmptyState icon={Network} title="Select a role to see the view" message={demoQuery.isError ? 'The demo document could not load. Return to Scan to paste a working copy.' : 'Load the fictional document to render its role-aware presentation.'} action={demoQuery.isError ? <Link href="/scan" data-testid="link-go-to-scan" className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground">Open Scan <ArrowRight size={13} /></Link> : undefined} /></div>}
      </section>
    </div>
  </div>;
}

function PolicyDocument({ scan, role, transformed, transforming }: { scan: ScanResult; role: string; transformed: TransformResult | null; transforming: boolean }) {
  const displayText = transformed?.role === role ? transformed.text : scan.text;
  return <div className="relative veil-scrollbar max-h-[640px] overflow-auto rounded-xl border border-border bg-[#f8fafb] p-5 font-mono text-[12px] leading-7 text-slate-700 sm:p-7"><span className="whitespace-pre-wrap">{displayText}</span>{transforming && <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-white/90 px-2.5 py-1.5 text-[10px] font-semibold text-primary shadow-sm"><RefreshCw size={11} className="animate-spin" /> Applying policy</span>}</div>;
}

function DisclosureFeedback({ result }: { result: DisclosureResult }) {
  return <div className={classNames('mt-4 rounded-xl border p-4', result.allowed ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50')}><div className="flex items-start gap-3">{result.allowed ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-700" /> : <XCircle size={18} className="mt-0.5 shrink-0 text-rose-700" />}<div><div className={classNames('text-xs font-semibold', result.allowed ? 'text-emerald-800' : 'text-rose-800')}>{result.allowed ? 'Disclosure allowed' : 'Disclosure blocked'}</div><p className={classNames('mt-1 text-xs leading-5', result.allowed ? 'text-emerald-800/75' : 'text-rose-800/75')}>{result.message}</p><div className="mt-2 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">Decision recorded · {formatTime(result.createdAt)}</div></div></div></div>;
}

function AuditPage() {
  const auditQuery = useGetAuditLog();
  const events = auditQuery.data ?? [];
  const [filter, setFilter] = useState<'ALL' | 'BLOCKED' | 'ALLOWED'>('ALL');
  const filtered = events.filter((event) => filter === 'ALL' || (filter === 'ALLOWED' ? event.result.toLowerCase().includes('allow') || event.result.toLowerCase().includes('approved') : !(event.result.toLowerCase().includes('allow') || event.result.toLowerCase().includes('approved'))));
  return <div className="veil-page-enter"><PageIntro eyebrow="Accountability record" title="Every attempt leaves a trace." description="The audit log records who asked, what category they asked for, and the policy decision. Never the underlying value." action={<div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-[10px] font-semibold text-muted-foreground"><LockKeyhole size={13} className="text-primary" /> Raw values excluded</div>} />
    <div className="px-5 py-7 sm:px-8 lg:px-11 lg:py-9">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1"><button type="button" onClick={() => setFilter('ALL')} data-testid="button-filter-all" className={classNames('rounded-md px-3 py-2 text-xs font-semibold', filter === 'ALL' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}>All events</button><button type="button" onClick={() => setFilter('BLOCKED')} data-testid="button-filter-blocked" className={classNames('rounded-md px-3 py-2 text-xs font-semibold', filter === 'BLOCKED' ? 'bg-rose-50 text-rose-700' : 'text-muted-foreground hover:text-foreground')}>Blocked</button><button type="button" onClick={() => setFilter('ALLOWED')} data-testid="button-filter-allowed" className={classNames('rounded-md px-3 py-2 text-xs font-semibold', filter === 'ALLOWED' ? 'bg-emerald-50 text-emerald-700' : 'text-muted-foreground hover:text-foreground')}>Allowed</button></div><div className="font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">{filtered.length} decisions shown</div></div>
      <section className="overflow-hidden rounded-2xl border border-border bg-card"><div className="hidden grid-cols-[1.3fr_.9fr_1fr_1fr] border-b border-border bg-secondary/45 px-6 py-3 font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground sm:grid"><span>Decision</span><span>Role</span><span>Resource category</span><span className="text-right">Recorded</span></div>{auditQuery.isLoading ? <div className="space-y-3 p-6"><SkeletonBlock className="h-14 w-full" /><SkeletonBlock className="h-14 w-full" /><SkeletonBlock className="h-14 w-full" /></div> : auditQuery.isError ? <div className="p-6"><ErrorState message="The audit service did not respond." onRetry={() => auditQuery.refetch()} /></div> : filtered.length === 0 ? <div className="p-6"><EmptyState icon={ScrollText} title={filter === 'ALL' ? 'No decisions recorded' : `No ${filter.toLowerCase()} decisions`} message="Disclosure tests will appear here as the newsroom works through the document." action={<Link href="/lens" data-testid="link-audit-to-lens" className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground">Open Disclosure Lens <ArrowRight size={13} /></Link>} /></div> : <div className="divide-y divide-border">{filtered.map((event) => <AuditTableRow event={event} key={event.id} />)}</div>}</section>
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4 text-xs leading-5 text-muted-foreground"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" /><span><strong className="font-semibold text-foreground">Privacy by record.</strong> VEIL stores the category and outcome, not the sensitive string. This makes the log useful for review without turning it into a second exposure surface.</span></div>
    </div>
  </div>;
}

function AuditTableRow({ event }: { event: AuditEvent }) {
  const allowed = event.result.toLowerCase().includes('allow') || event.result.toLowerCase().includes('approved');
  return <div className="grid gap-3 px-5 py-4 sm:grid-cols-[1.3fr_.9fr_1fr_1fr] sm:items-center sm:px-6"><div className="flex items-center gap-3"><div className={classNames('grid size-8 place-items-center rounded-full', allowed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>{allowed ? <Check size={14} /> : <X size={14} />}</div><div><div className="text-sm font-semibold">{event.action}</div><div className={classNames('mt-1 font-mono text-[9px] uppercase tracking-wider', allowed ? 'text-emerald-700' : 'text-rose-700')}>{allowed ? 'Allowed' : 'Blocked'}</div></div></div><div><div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground sm:hidden">Role</div><StatusChip role={event.role} /></div><div><div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground sm:hidden">Resource</div><span className="inline-flex items-center gap-1.5 text-xs font-semibold"><Fingerprint size={13} className="text-muted-foreground" /> {typeMeta[event.resource]?.label ?? event.resource}</span></div><div className="text-left sm:text-right"><div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground sm:hidden">Recorded</div><span className="font-mono text-[10px] text-muted-foreground">{formatTime(event.time)}</span></div></div>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><AppShell><Switch><Route path="/" component={Dashboard} /><Route path="/scan" component={ScanPage} /><Route path="/lens" component={LensPage} /><Route path="/audit" component={AuditPage} /><Route component={NotFound} /></Switch></AppShell></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><Router /><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;