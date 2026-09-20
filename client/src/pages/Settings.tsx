import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { GoalProgress } from '@shared/schema';
import { ImportCard } from '@/components/settings/ImportCard';
import { ErrorState } from '@/components/common/States';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { ApiError, api, type FieldErrors } from '@/lib/api';

const GOAL_META: Record<GoalProgress['type'], { label: string; unit: string; step: string }> = {
  steps: { label: 'Daily steps', unit: 'steps', step: '100' },
  calories: { label: 'Daily calories', unit: 'kcal', step: '10' },
  activeMinutes: { label: 'Daily active minutes', unit: 'min', step: '5' },
  sleep: { label: 'Nightly sleep', unit: 'hours', step: '0.5' },
  water: { label: 'Daily water', unit: 'litres', step: '0.1' },
};

const PROFILE_FIELDS = [
  { name: 'firstName', label: 'First name', type: 'text' },
  { name: 'lastName', label: 'Last name', type: 'text' },
  { name: 'heightCm', label: 'Height', type: 'number', unit: 'cm', step: '1' },
  { name: 'weightKg', label: 'Weight', type: 'number', unit: 'kg', step: '0.1' },
  { name: 'age', label: 'Age', type: 'number', unit: 'years', step: '1' },
  { name: 'location', label: 'Location', type: 'text' },
] as const;

type ProfileField = (typeof PROFILE_FIELDS)[number]['name'];

function ProfileCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<ProfileField, string>>({
    firstName: '',
    lastName: '',
    heightCm: '',
    weightKg: '',
    age: '',
    location: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Seed from the signed-in user once it lands, and whenever it changes.
  useEffect(() => {
    if (!user) return;
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      heightCm: user.heightCm?.toString() ?? '',
      weightKg: user.weightKg?.toString() ?? '',
      age: user.age?.toString() ?? '',
      location: user.location ?? '',
    });
  }, [user]);

  const save = useMutation({
    mutationFn: (patch: Record<string, unknown>) => api.updateProfile(patch),
    onSuccess: async ({ user: updated }) => {
      queryClient.setQueryData(['auth', 'me'], updated);
      toast({ title: 'Profile saved', tone: 'success' });
      setFieldErrors({});
      setFormError(null);
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
        setFieldErrors(error.fieldErrors ?? {});
      } else {
        setFormError('Could not save your profile.');
      }
    },
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    // Empty optional fields are sent as null so they can be cleared.
    const patch: Record<string, unknown> = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      location: form.location.trim() === '' ? null : form.location.trim(),
    };

    for (const key of ['heightCm', 'weightKg', 'age'] as const) {
      const raw = form[key].trim();
      if (raw === '') {
        patch[key] = null;
        continue;
      }
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        setFieldErrors({ [key]: ['Enter a number.'] });
        return;
      }
      patch[key] = key === 'weightKg' ? value : Math.round(value);
    }

    save.mutate(patch);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Height, weight and age are used to estimate calorie burn. Leave anything blank you would
          rather not record.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={submit} noValidate>
          {formError && (
            <Alert tone="error" className="mb-4">
              {formError}
            </Alert>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {PROFILE_FIELDS.map((field) => {
              const messages = fieldErrors[field.name];
              return (
                <div key={field.name} className="flex flex-col gap-1.5">
                  <Label htmlFor={`profile-${field.name}`}>
                    {field.label}
                    {'unit' in field && field.unit ? (
                      <span className="ml-1 font-normal text-text-subtle">({field.unit})</span>
                    ) : null}
                  </Label>
                  <Input
                    id={`profile-${field.name}`}
                    type={field.type}
                    inputMode={field.type === 'number' ? 'decimal' : undefined}
                    step={'step' in field ? field.step : undefined}
                    value={form[field.name]}
                    aria-invalid={messages !== undefined}
                    aria-describedby={messages ? `profile-${field.name}-error` : undefined}
                    onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                  />
                  {messages && (
                    <p id={`profile-${field.name}-error`} className="text-xs text-danger">
                      {messages[0]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <Button type="submit" className="mt-5" disabled={save.isPending}>
            {save.isPending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            {save.isPending ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function GoalsCard() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['goals'],
    queryFn: () => api.goals(),
  });

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [invalid, setInvalid] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: ({ type, target }: { type: string; target: number }) =>
      api.saveGoal({ type, target }),
    onSuccess: async (_result, { type }) => {
      toast({ title: `${GOAL_META[type as GoalProgress['type']].label} updated`, tone: 'success' });
      setDrafts((d) => {
        const next = { ...d };
        delete next[type];
        return next;
      });
      await queryClient.invalidateQueries();
    },
    onError: (err: unknown) =>
      toast({
        title: 'Could not update that goal',
        description: err instanceof ApiError ? err.message : undefined,
        tone: 'error',
      }),
  });

  if (error) {
    return <ErrorState message="We could not load your goals." onRetry={() => void refetch()} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily goals</CardTitle>
        <CardDescription>
          These drive the rings on your dashboard and the thresholds the insight engine uses.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {invalid && (
          <Alert tone="error" className="mb-4">
            {invalid}
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : (
          <ul className="space-y-3">
            {(data?.goals ?? []).map((goal) => {
              const meta = GOAL_META[goal.type];
              const draft = drafts[goal.type];
              const value = draft ?? String(goal.target);
              const dirty = draft !== undefined && Number(draft) !== goal.target;

              return (
                <li key={goal.id} className="flex flex-wrap items-end gap-3">
                  <div className="flex min-w-40 flex-1 flex-col gap-1.5">
                    <Label htmlFor={`goal-${goal.type}`}>
                      {meta.label}
                      <span className="ml-1 font-normal text-text-subtle">({meta.unit})</span>
                    </Label>
                    <Input
                      id={`goal-${goal.type}`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step={meta.step}
                      value={value}
                      onChange={(e) => setDrafts((d) => ({ ...d, [goal.type]: e.target.value }))}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    disabled={!dirty || save.isPending}
                    onClick={() => {
                      const target = Number(draft);
                      if (!Number.isFinite(target) || target <= 0) {
                        setInvalid(`${meta.label} must be greater than zero.`);
                        return;
                      }
                      setInvalid(null);
                      save.mutate({ type: goal.type, target });
                    }}
                  >
                    Save
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ExportCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Export your data</CardTitle>
        <CardDescription>
          Everything recorded under your account. JSON includes profile, goals, activity, sessions
          and challenges; CSV is the daily activity series only.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button asChild variant="secondary">
          <a href={api.exportUrl('json')} download>
            <Download aria-hidden="true" />
            Download JSON
          </a>
        </Button>
        <Button asChild variant="secondary">
          <a href={api.exportUrl('csv')} download>
            <Download aria-hidden="true" />
            Download CSV
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="mt-0.5 text-sm text-text-muted">
          Your profile, goals, and the data going in and out.
        </p>
      </div>

      <ImportCard />
      <ExportCard />
      <GoalsCard />
      <ProfileCard />
    </div>
  );
}
