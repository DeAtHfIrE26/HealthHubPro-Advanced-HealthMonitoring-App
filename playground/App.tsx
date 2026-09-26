import { Droplets, Dumbbell, Flame, Footprints, Moon, Timer } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  ActivityChart,
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  GoalRing,
  Skeleton,
  StatTile,
  Toaster,
  detectFormat,
  formatDecimal,
  formatNumber,
  parseAppleHealth,
  parseCsv,
  toast,
  useTheme,
  type ParseOutcome,
} from '../src';
import { SAMPLE_APPLE_HEALTH, SAMPLE_CSV, makeGoals, makeHistory } from './demo-data';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <p className="text-sm text-text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

function ParserDemo() {
  const [outcome, setOutcome] = useState<ParseOutcome | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(name: string, content: string) {
    setBusy(true);
    setLabel(name);
    const file = new File([content], name, { type: 'text/plain' });
    const format = detectFormat(file);
    const result = format === 'apple-health' ? await parseAppleHealth(file) : await parseCsv(file);
    setOutcome(result);
    setBusy(false);
    toast({
      title: `Parsed ${name}`,
      description: `${result.days.length} days from ${formatNumber(result.recordsScanned)} records.`,
      tone: 'success',
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Streaming parsers</CardTitle>
        <CardDescription>
          The same code the app uses, running entirely in this tab. Files are read in 4&nbsp;MB
          slices with a carry buffer, so a multi-hundred-megabyte Apple Health export never has to
          fit in memory at once.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={() => void run('export.xml', SAMPLE_APPLE_HEALTH)}
          >
            Parse Apple Health XML
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void run('activity.csv', SAMPLE_CSV)}
          >
            Parse a Google Fit / Fitbit CSV
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy || !outcome}
            onClick={() => {
              setOutcome(null);
              setLabel(null);
            }}
          >
            Clear
          </Button>
        </div>

        {outcome === null ? (
          <p className="mt-4 text-sm text-text-subtle">Pick a sample above. Both are synthetic.</p>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm">
              <span className="numeric font-semibold">{outcome.days.length}</span> days from{' '}
              <span className="numeric font-semibold">{formatNumber(outcome.recordsScanned)}</span>{' '}
              records in <code className="text-text">{label}</code>
            </p>

            {outcome.issues.length > 0 && (
              <Alert tone="warn" title={`${outcome.issues.length} row(s) skipped`}>
                <ul className="mt-1 space-y-0.5 text-xs">
                  {outcome.issues.map((issue) => (
                    <li key={`${issue.line ?? 'x'}-${issue.reason}`}>
                      {issue.line !== undefined ? `Line ${issue.line}: ` : ''}
                      {issue.reason}
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            <div className="max-h-56 overflow-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface-raised">
                  <tr>
                    {['Date', 'Steps', 'Calories', 'Active', 'Sleep', 'Water'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-text-muted">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {outcome.days.map((d) => (
                    <tr key={d.date} className="border-t border-border">
                      <td className="px-3 py-1.5 text-text-muted">{d.date}</td>
                      <td className="numeric px-3 py-1.5">{d.steps ?? '—'}</td>
                      <td className="numeric px-3 py-1.5">{d.calories ?? '—'}</td>
                      <td className="numeric px-3 py-1.5">{d.activeMinutes ?? '—'}</td>
                      <td className="numeric px-3 py-1.5">
                        {d.sleepHours !== undefined ? formatDecimal(d.sleepHours) : '—'}
                      </td>
                      <td className="numeric px-3 py-1.5">
                        {d.waterLiters !== undefined ? formatDecimal(d.waterLiters) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-text-subtle">
              Note the Apple Health sample: <code className="text-text">InBed</code> records are
              ignored because they overstate real sleep, kilojoules are converted to kilocalories,
              and the unmapped heart-rate record is counted as scanned but produces no day.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [days, setDays] = useState(7);
  const history = useMemo(() => makeHistory(30), []);
  const goals = useMemo(() => makeGoals(history), [history]);
  const today = history.at(-1);

  const tiles = [
    { icon: Footprints, label: 'Steps', value: today?.steps ?? 0, format: formatNumber },
    {
      icon: Flame,
      label: 'Calories',
      value: today?.calories ?? 0,
      format: formatNumber,
      unit: 'kcal',
    },
    {
      icon: Timer,
      label: 'Active',
      value: today?.activeMinutes ?? 0,
      format: formatNumber,
      unit: 'min',
    },
    { icon: Moon, label: 'Sleep', value: today?.sleepHours ?? 0, format: formatDecimal, unit: 'h' },
    {
      icon: Droplets,
      label: 'Water',
      value: today?.waterLiters ?? 0,
      format: formatDecimal,
      unit: 'L',
    },
  ];

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <div>
            <h1 className="font-display text-xl font-bold">HealthHubPro Showcase</h1>
            <p className="text-sm text-text-muted">
              Components, hooks and parsers on synthetic data
            </p>
          </div>
          <Badge tone="warn" className="ml-auto">
            Synthetic data
          </Badge>
          <Button size="sm" variant="secondary" onClick={toggleTheme}>
            {theme === 'dark' ? 'Light' : 'Dark'} theme
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-8">
        <Section
          title="Stat tiles"
          description="Figures ease towards their value rather than swapping, and the deltas come from the same series."
        >
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {tiles.map((tile, i) => (
              <li key={tile.label}>
                <StatTile {...tile} index={i} delta={i % 2 === 0 ? 8 : -9} />
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title="Goal rings"
          description="SVG arcs that sweep in from zero on mount, with the figures also given as text."
        >
          <Card>
            <CardContent className="pt-5">
              <ul className="grid grid-cols-3 gap-4 sm:grid-cols-5">
                {goals.map((goal) => (
                  <GoalRing key={goal.id} goal={goal} />
                ))}
              </ul>
            </CardContent>
          </Card>
        </Section>

        <Section
          title="Activity chart"
          description="Hand-rolled: flex bands scaled with transform, responsive with no measurement. It replaced 99 kB gzipped of charting library with 2 kB."
        >
          <Card>
            <CardContent className="pt-5">
              <ActivityChart
                history={history.slice(-days)}
                goals={goals}
                days={days}
                onDaysChange={setDays}
              />
            </CardContent>
          </Card>
        </Section>

        <Section title="Parsers" description="Apple Health XML and CSV, read in the browser.">
          <ParserDemo />
        </Section>

        <Section
          title="States"
          description="What a screen shows when there is nothing, or something went wrong."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardContent className="pt-5">
                <div className="space-y-2">
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8 w-2/3" />
                  <Skeleton className="h-24" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <EmptyState
                  icon={Dumbbell}
                  title="No workouts yet"
                  description="Start one and it will show up here."
                  action={<Button size="sm">Browse workouts</Button>}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <ErrorState
                  message="We could not load that. Your connection may have dropped."
                  onRetry={() => toast({ title: 'Retried', tone: 'success' })}
                />
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section title="Primitives" description="Buttons, badges and alerts in both themes.">
          <Card>
            <CardContent className="space-y-4 pt-5">
              <div className="flex flex-wrap gap-2">
                {(['primary', 'secondary', 'ghost', 'outline', 'danger'] as const).map((v) => (
                  <Button key={v} variant={v} onClick={() => toast({ title: `${v} pressed` })}>
                    {v}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {(['neutral', 'accent', 'info', 'warn', 'danger'] as const).map((t) => (
                  <Badge key={t} tone={t}>
                    {t}
                  </Badge>
                ))}
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <Alert tone="info" title="Info">
                  Something worth knowing.
                </Alert>
                <Alert tone="warn" title="Warning">
                  This replaces existing values.
                </Alert>
                <Alert tone="error" title="Error">
                  That file could not be read.
                </Alert>
              </div>
            </CardContent>
          </Card>
        </Section>
      </main>

      <Toaster />
    </div>
  );
}
