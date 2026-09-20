import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { ActivityStat } from '@shared/schema';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ApiError, api } from '@/lib/api';
import { formatRelativeDay, todayIso } from '@/lib/format';

const FIELDS = [
  { key: 'steps', label: 'Steps', step: '1', max: 300000, unit: '' },
  { key: 'calories', label: 'Calories burned', step: '1', max: 30000, unit: 'kcal' },
  { key: 'activeMinutes', label: 'Active minutes', step: '1', max: 1440, unit: 'min' },
  { key: 'sleepHours', label: 'Sleep', step: '0.1', max: 24, unit: 'hours' },
  { key: 'waterLiters', label: 'Water', step: '0.1', max: 20, unit: 'litres' },
] as const;

type FormState = Record<(typeof FIELDS)[number]['key'], string>;

const toFormState = (activity: ActivityStat | undefined): FormState => ({
  steps: String(activity?.steps ?? 0),
  calories: String(activity?.calories ?? 0),
  activeMinutes: String(activity?.activeMinutes ?? 0),
  sleepHours: String(activity?.sleepHours ?? 0),
  waterLiters: String(activity?.waterLiters ?? 0),
});

export function LogActivityDialog({
  open,
  onOpenChange,
  activity,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: ActivityStat | undefined;
}) {
  const queryClient = useQueryClient();
  const today = todayIso();
  const [date, setDate] = useState(today);
  const [form, setForm] = useState<FormState>(() => toFormState(activity));
  const [formError, setFormError] = useState<string | null>(null);

  // Today's numbers are already on the page; any other day has to be fetched
  // so the form edits what is stored rather than overwriting it with zeroes.
  const other = useQuery({
    queryKey: ['activity', date],
    queryFn: () => api.activity(date),
    enabled: open && date !== today,
  });

  const stored = date === today ? activity : other.data?.activity;
  const loading = date !== today && other.isPending;

  // Re-sync when the dialog reopens, and when the chosen day's data arrives,
  // so it never shows a stale draft or another day's numbers.
  useEffect(() => {
    if (open) {
      setForm(toFormState(stored));
      setFormError(null);
    }
  }, [open, stored]);

  // A fresh open always starts on today.
  useEffect(() => {
    if (open) setDate(today);
  }, [open, today]);

  const mutation = useMutation({
    mutationFn: (patch: Record<string, number | string>) => api.saveActivity(patch),
    onSuccess: async () => {
      toast({
        title: `Activity saved for ${formatRelativeDay(date, today).toLowerCase()}`,
        tone: 'success',
      });
      await queryClient.invalidateQueries();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      setFormError(error instanceof ApiError ? error.message : 'Could not save. Please try again.');
    },
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (date > today) {
      setFormError('That day has not happened yet.');
      return;
    }

    const patch: Record<string, number | string> = { date };
    for (const field of FIELDS) {
      const raw = form[field.key].trim();
      const value = raw === '' ? 0 : Number(raw);
      if (!Number.isFinite(value) || value < 0) {
        setFormError(`${field.label} must be zero or more.`);
        return;
      }
      if (value > field.max) {
        setFormError(`${field.label} cannot exceed ${field.max.toLocaleString()}.`);
        return;
      }
      patch[field.key] = field.step === '1' ? Math.round(value) : value;
    }

    mutation.mutate(patch);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log activity</DialogTitle>
          <DialogDescription>
            Update any metric. Values replace what is already recorded for the day you pick.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogBody>
            {formError ? (
              <Alert tone="error" className="mb-4">
                {formError}
              </Alert>
            ) : null}

            <div className="mb-4 flex flex-col gap-1.5">
              <Label htmlFor="activity-date">Day</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="activity-date"
                  type="date"
                  className="w-auto"
                  max={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value || today)}
                />
                <span aria-live="polite" className="text-sm text-text-muted">
                  {loading ? 'Loading…' : formatRelativeDay(date, today)}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <div key={field.key} className="flex flex-col gap-1.5">
                  <Label htmlFor={`activity-${field.key}`}>
                    {field.label}
                    {field.unit ? (
                      <span className="ml-1 font-normal text-text-subtle">({field.unit})</span>
                    ) : null}
                  </Label>
                  <Input
                    id={`activity-${field.key}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max={field.max}
                    step={field.step}
                    value={form[field.key]}
                    disabled={loading}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || loading}>
              {mutation.isPending ? 'Saving…' : 'Save activity'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
