import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  IMPORT_MAX_DAYS,
  METRIC_LABELS,
  dateRange,
  metricsPresent,
  type ImportDay,
  type ParseOutcome,
} from '@shared/import';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ApiError, api } from '@/lib/api';
import { formatNumber, formatShortDate } from '@/lib/format';
import { parseAppleHealth } from '@/lib/import/appleHealth';
import { detectFormat, parseCsv } from '@/lib/import/csv';
import { cn } from '@/lib/utils';

type Stage =
  | { kind: 'idle' }
  | { kind: 'parsing'; fileName: string; progress: number }
  | { kind: 'preview'; fileName: string; outcome: ParseOutcome }
  | { kind: 'error'; message: string };

export function ImportCard() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [strategy, setStrategy] = useState<'merge' | 'overwrite'>('merge');
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setStage({ kind: 'idle' });
    if (inputRef.current) inputRef.current.value = '';
  };

  async function handleFile(file: File) {
    const format = detectFormat(file);
    if (format === 'unknown') {
      setStage({
        kind: 'error',
        message:
          'Unsupported file type. Choose an Apple Health export.xml, or a .csv with a date column.',
      });
      return;
    }

    setStage({ kind: 'parsing', fileName: file.name, progress: 0 });

    try {
      const outcome =
        format === 'apple-health'
          ? await parseAppleHealth(file, (progress) =>
              setStage({ kind: 'parsing', fileName: file.name, progress }),
            )
          : await parseCsv(file);

      setStage({ kind: 'preview', fileName: file.name, outcome });
    } catch (error) {
      setStage({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not read that file.',
      });
    }
  }

  const upload = useMutation({
    mutationFn: async (days: ImportDay[]) => {
      // The API caps a request; send several when the history is long.
      const totals = { created: 0, updated: 0, skipped: 0 };
      for (let i = 0; i < days.length; i += IMPORT_MAX_DAYS) {
        const { result } = await api.importDays(days.slice(i, i + IMPORT_MAX_DAYS), strategy);
        totals.created += result.created;
        totals.updated += result.updated;
        totals.skipped += result.skipped;
      }
      return totals;
    },
    onSuccess: async (totals) => {
      toast({
        title: 'Import complete',
        description: `${formatNumber(totals.created)} days added, ${formatNumber(totals.updated)} updated, ${formatNumber(totals.skipped)} unchanged.`,
        tone: 'success',
      });
      await queryClient.invalidateQueries();
      reset();
    },
    onError: (error: unknown) => {
      setStage({
        kind: 'error',
        message: error instanceof ApiError ? error.message : 'The import failed. Please try again.',
      });
    },
  });

  function Preview({ fileName, outcome }: { fileName: string; outcome: ParseOutcome }) {
    const { days, issues, recordsScanned } = outcome;
    const range = dateRange(days);
    const metrics = metricsPresent(days);

    if (days.length === 0) {
      return (
        <div>
          <Alert tone="error" title="Nothing importable in that file">
            {issues[0]?.reason ?? 'No daily records could be read.'}
          </Alert>
          <Button variant="secondary" className="mt-4" onClick={reset}>
            Try another file
          </Button>
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-start gap-3 rounded-md border border-accent/30 bg-accent/5 p-3">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
          <div className="min-w-0 text-sm">
            <p className="font-medium text-text">
              <span className="numeric">{formatNumber(days.length)}</span> days ready to import
            </p>
            <p className="mt-0.5 truncate text-text-muted">
              {fileName} · {formatNumber(recordsScanned)} records read
            </p>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-2xs uppercase text-text-subtle">Date range</dt>
            <dd className="numeric">
              {range ? `${formatShortDate(range.from)} – ${formatShortDate(range.to)}` : '—'}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-2xs uppercase text-text-subtle">Metrics found</dt>
            <dd>{metrics.map((m) => METRIC_LABELS[m]).join(', ') || 'none'}</dd>
          </div>
        </dl>

        {issues.length > 0 && (
          <Alert tone="warn" className="mt-4" title={`${issues.length} row(s) skipped`}>
            <ul className="mt-1 space-y-0.5 text-xs">
              {issues.slice(0, 3).map((issue) => (
                <li key={`${issue.line}-${issue.reason}`}>
                  Line {issue.line}: {issue.reason}
                </li>
              ))}
              {issues.length > 3 && <li>…and {issues.length - 3} more.</li>}
            </ul>
          </Alert>
        )}

        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-text-muted">
            When a day already has data
          </legend>
          <div className="mt-2 space-y-2">
            {(
              [
                ['merge', 'Keep what I logged', 'Only fills metrics that are currently empty.'],
                ['overwrite', 'Replace with the file', 'Imported values win for every metric.'],
              ] as const
            ).map(([value, label, hint]) => (
              <label
                key={value}
                className={cn(
                  'flex cursor-pointer gap-3 rounded-md border p-3 transition-colors',
                  strategy === value ? 'border-accent bg-accent/5' : 'border-border',
                )}
              >
                <input
                  type="radio"
                  name="import-strategy"
                  value={value}
                  checked={strategy === value}
                  onChange={() => setStrategy(value)}
                  className="mt-1 accent-[hsl(var(--accent))]"
                />
                <span className="text-sm">
                  <span className="font-medium text-text">{label}</span>
                  <span className="mt-0.5 block text-xs text-text-muted">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {strategy === 'overwrite' && (
          <Alert tone="warn" className="mt-3">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
              This replaces existing values for those days. Export a backup first if unsure.
            </span>
          </Alert>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => upload.mutate(days)} disabled={upload.isPending}>
            {upload.isPending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Upload aria-hidden="true" />
            )}
            {upload.isPending ? 'Importing…' : `Import ${formatNumber(days.length)} days`}
          </Button>
          <Button variant="ghost" onClick={reset} disabled={upload.isPending}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import your history</CardTitle>
        <CardDescription>
          Bring in an Apple Health <code className="text-text">export.xml</code> or a CSV from
          Google Fit, Fitbit or a spreadsheet. Large files are read in your browser — only the daily
          totals are uploaded.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {stage.kind === 'idle' && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) void handleFile(file);
            }}
            className={cn(
              'flex flex-col items-center rounded-lg border border-dashed px-6 py-10 text-center transition-colors',
              dragging ? 'border-accent bg-accent/5' : 'border-border-strong',
            )}
          >
            <FileUp className="size-6 text-text-subtle" aria-hidden="true" />
            <p className="mt-3 text-sm text-text-muted">Drop a file here, or</p>
            {/*
              The input carries the accessible name and the label is its visible
              face, so assistive tech sees one control rather than a button and a
              hidden input that both claim to choose a file. `peer` relays the
              input's focus ring onto the thing you can actually see.
            */}
            <input
              ref={inputRef}
              id="import-file"
              type="file"
              accept=".xml,.csv,.tsv,.txt"
              className="peer sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <Button
              asChild
              className="mt-3 cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg"
            >
              <label htmlFor="import-file">
                <Upload aria-hidden="true" />
                Choose a file
              </label>
            </Button>
            <p className="mt-3 text-2xs text-text-subtle">
              Apple Health .xml · Google Fit / Fitbit / generic .csv
            </p>
          </div>
        )}

        {stage.kind === 'parsing' && (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto size-5 animate-spin text-text-subtle" aria-hidden="true" />
            <p className="mt-3 truncate text-sm text-text-muted">Reading {stage.fileName}…</p>
            <div
              className="mx-auto mt-3 h-1.5 w-56 overflow-hidden rounded-full bg-surface-raised"
              role="progressbar"
              aria-valuenow={Math.round(stage.progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-chart-1 transition-[width] duration-200"
                style={{ width: `${Math.max(4, stage.progress * 100)}%` }}
              />
            </div>
          </div>
        )}

        {stage.kind === 'preview' && <Preview fileName={stage.fileName} outcome={stage.outcome} />}

        {stage.kind === 'error' && (
          <div>
            <Alert tone="error" title="Could not import that file">
              {stage.message}
            </Alert>
            <Button variant="secondary" className="mt-4" onClick={reset}>
              Try another file
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
