import {
  ArrowRight,
  Bot,
  Building2,
  CalendarRange,
  Database,
  ShieldCheck,
  Table2,
  TerminalSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';

/** Facts the app can actually back up — every one is checkable in the dataset. */
const COVERAGE = [
  { icon: Building2, value: '49', label: 'U.S. public companies' },
  { icon: Table2, value: '5', label: 'sectors' },
  { icon: CalendarRange, value: '2022–2025', label: 'fiscal years' },
  { icon: Database, value: '192', label: 'rows of income-statement data' },
];

const METRICS = ['Revenue', 'Net income', 'Operating income', 'Gross profit'];

const STEPS = [
  {
    title: 'You ask in plain language',
    body: '"Top 5 companies by revenue in 2024" — no SQL required.',
  },
  {
    title: 'The LLM writes and runs the query',
    body: 'The SQL is shown next to the answer, so any figure can be traced to the statement that produced it.',
  },
  {
    title: 'You get the numbers, not a guess',
    body: 'If the data is not in the table, it says so rather than inventing a figure.',
  },
];

const PILLS = [
  { icon: Bot, label: 'LLM writes the SQL, not the answer' },
  { icon: TerminalSquare, label: 'Every answer shows its SQL' },
  { icon: ShieldCheck, label: 'Read-only, SELECT-only access' },
  { icon: Database, label: 'Answers grounded in PostgreSQL' },
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-dvh bg-sidebar-dark">
      {/* Branding panel. It holds the primary call to action, so it is a real
          landmark rather than decoration — only the orbs, grid and particles
          inside it are hidden from assistive tech. */}
      <section className="relative hidden flex-1 items-center justify-center overflow-hidden p-16 lg:flex">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="orb-blur absolute -left-16 top-[10%] h-[350px] w-[350px] animate-orb-float rounded-full bg-emerald-soft" />
          <div className="orb-blur absolute -right-16 bottom-[15%] h-[280px] w-[280px] animate-orb-float rounded-full bg-emerald-soft [animation-delay:-7s]" />
          <div className="orb-blur absolute left-[40%] top-1/2 h-[200px] w-[200px] animate-orb-float rounded-full bg-emerald-soft [animation-delay:-14s]" />
          <div className="grid-overlay absolute inset-0" />

          {[
            'left-[15%] top-[20%] [animation-delay:0s]',
            'left-[75%] top-[35%] [animation-delay:1.2s]',
            'left-[25%] top-[60%] [animation-delay:2.4s]',
            'left-[65%] top-[75%] [animation-delay:0.8s]',
            'left-[50%] top-[45%] [animation-delay:3s]',
          ].map((position) => (
            <span
              key={position}
              className={`absolute h-[3px] w-[3px] animate-particle rounded-full bg-primary ${position}`}
            />
          ))}
        </div>

        <div className="relative z-10 flex w-full max-w-lg flex-col items-center text-center">
          <div className="mb-10 flex items-center gap-3.5">
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-emerald shadow-green-lg">
              <Database className="h-7 w-7 text-white" />
            </span>
            <span className="text-2xl font-bold tracking-tight text-sidebar-active-foreground">
              Financial Data Chat
            </span>
          </div>

          <span className="mb-5 flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
            <Bot className="h-3.5 w-3.5" />
            LLM-powered SQL analyst
          </span>

          <h2 className="mb-5 w-full text-[44px] font-extrabold leading-[1.15] tracking-tight text-sidebar-active-foreground">
            Ask the numbers,{' '}
            <span className="bg-emerald bg-clip-text text-transparent">see the query</span>
          </h2>

          <p className="mb-10 w-full text-[17px] leading-relaxed text-sidebar-foreground">
            Ask in plain English. An LLM turns the question into SQL, runs it against
            four years of income-statement data for 49 U.S. public companies, and shows
            you the query behind every number.
          </p>

          <Button
            size="xl"
            onClick={() => navigate('/chat')}
            className="animate-glow px-12 text-[17px]"
          >
            Get started
            <ArrowRight className="h-5 w-5" />
          </Button>
          <p className="mt-3.5 w-full text-[13px] text-sidebar-muted">
            No account needed — conversations are kept in this browser.
          </p>

          <div className="mt-12 flex w-full flex-wrap justify-center gap-2.5">
            {PILLS.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/[0.06] px-4 py-2.5 text-[13px] font-medium text-sidebar-foreground"
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Line-chart flourish along the bottom edge. */}
        <svg
          viewBox="0 0 800 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-16 bottom-14 h-24 opacity-[0.12]"
        >
          <defs>
            <linearGradient id="landing-chart" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-bar-from)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--chart-bar-from)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 80 Q100 60 200 65 T400 40 T600 55 T800 25"
            stroke="var(--chart-bar-from)"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M0 80 Q100 60 200 65 T400 40 T600 55 T800 25 V100 H0 Z"
            fill="url(#landing-chart)"
          />
        </svg>
      </section>

      {/* Summary panel — what this is, what data it holds, and the way in. */}
      <section className="relative flex w-full flex-col justify-center border-l border-white/[0.06] bg-sidebar-to px-6 py-14 sm:px-10 lg:w-[560px] lg:min-w-[560px] lg:px-14">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald shadow-green">
              <Database className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-bold tracking-tight text-sidebar-active-foreground">
              Financial Data Chat
            </span>
          </div>

          <h1 className="mb-3 text-[28px] font-bold tracking-tight text-sidebar-active-foreground">
            What this is
          </h1>
          <p className="mb-9 text-[15px] leading-relaxed text-sidebar-foreground">
            A chat assistant for income-statement data, built on a large language model
            (LLM). The LLM's job is to translate your question into SQL — not to supply
            the figures. Every number comes from a query run against PostgreSQL, never
            from the model's memory, and the query is shown alongside the reply.
          </p>

          <h2 className="mb-3 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-sidebar-label">
            The data
          </h2>
          <dl className="mb-6 grid grid-cols-2 gap-2.5">
            {COVERAGE.map(({ icon: Icon, value, label }) => (
              <div
                key={label}
                className="rounded-[11px] border border-white/[0.06] bg-white/[0.03] px-3.5 py-3"
              >
                <Icon className="mb-2 h-4 w-4 text-primary" />
                <dt className="text-[18px] font-bold leading-none text-sidebar-active-foreground">
                  {value}
                </dt>
                <dd className="mt-1.5 text-[12px] leading-snug text-sidebar-muted">
                  {label}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mb-9 rounded-[11px] border border-white/[0.06] bg-white/[0.03] px-3.5 py-3">
            <p className="mb-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-sidebar-label">
              Metrics available
            </p>
            <div className="flex flex-wrap gap-1.5">
              {METRICS.map((metric) => (
                <span
                  key={metric}
                  className="rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-medium text-sidebar-active-foreground"
                >
                  {metric}
                </span>
              ))}
            </div>
            <p className="mt-2.5 text-[12px] leading-snug text-sidebar-muted">
              Some figures are genuinely missing — Amazon has no gross profit here, and
              banks like Goldman have no revenue line. The assistant says so instead of
              filling the gap.
            </p>
          </div>

          <h2 className="mb-3 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-sidebar-label">
            How it works
          </h2>
          <ol className="mb-10 space-y-3.5">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[11px] font-bold text-primary">
                  {index + 1}
                </span>
                <span>
                  <span className="block text-[14px] font-semibold text-sidebar-active-foreground">
                    {step.title}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-sidebar-muted">
                    {step.body}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          {/* The branding panel carries the call to action from lg up, but it is
              hidden below that — without this the primary action would simply
              not exist on a phone. */}
          <div className="lg:hidden">
            <Button
              size="xl"
              onClick={() => navigate('/chat')}
              className="w-full animate-glow"
            >
              Get started
              <ArrowRight className="h-5 w-5" />
            </Button>
            <p className="mt-3 text-center text-[12px] text-sidebar-muted">
              No account needed — conversations are kept in this browser.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
