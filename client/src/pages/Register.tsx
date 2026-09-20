import { Activity, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { ApiError, type FieldErrors } from '@/lib/api';

type Field = 'firstName' | 'lastName' | 'username' | 'email' | 'password';

const FIELDS: Array<{
  name: Field;
  label: string;
  type?: string;
  autoComplete: string;
  hint?: string;
  half?: boolean;
}> = [
  { name: 'firstName', label: 'First name', autoComplete: 'given-name', half: true },
  { name: 'lastName', label: 'Last name', autoComplete: 'family-name', half: true },
  {
    name: 'username',
    label: 'Username',
    autoComplete: 'username',
    hint: 'Letters, numbers, hyphens and underscores. At least 3 characters.',
  },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    autoComplete: 'new-password',
    hint: 'At least 8 characters.',
  },
];

export default function Register() {
  const [, navigate] = useLocation();
  const { signUp } = useAuth();
  const [form, setForm] = useState<Record<Field, string>>({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setPending(true);
    try {
      await signUp(form);
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors ?? {});
      } else {
        setError('Could not create your account. Please try again.');
      }
      setPending(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col justify-center px-4 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex size-11 items-center justify-center rounded-lg bg-accent">
            <Activity className="size-5 text-accent-ink" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold">Create your account</h1>
          <p className="mt-1 text-sm text-text-muted">
            Starts with sensible daily goals you can change later.
          </p>
        </div>

        <form onSubmit={submit} noValidate>
          {error ? (
            <Alert tone="error" className="mb-4">
              {error}
            </Alert>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((field) => {
              const messages = fieldErrors[field.name];
              const describedBy =
                [messages ? `${field.name}-error` : null, field.hint ? `${field.name}-hint` : null]
                  .filter(Boolean)
                  .join(' ') || undefined;

              return (
                <div
                  key={field.name}
                  className={
                    field.half ? 'flex flex-col gap-1.5' : 'col-span-2 flex flex-col gap-1.5'
                  }
                >
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type={field.type ?? 'text'}
                    autoComplete={field.autoComplete}
                    required
                    value={form[field.name]}
                    onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                    aria-invalid={messages !== undefined}
                    aria-describedby={describedBy}
                  />
                  {messages ? (
                    <p id={`${field.name}-error`} className="text-xs text-danger">
                      {messages[0]}
                    </p>
                  ) : field.hint ? (
                    <p id={`${field.name}-hint`} className="text-xs text-text-subtle">
                      {field.hint}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <Button type="submit" className="mt-5 w-full" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {pending ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Already registered?{' '}
          <Link
            href="/login"
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
