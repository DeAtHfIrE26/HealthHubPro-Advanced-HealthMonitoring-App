import { useSyncExternalStore } from 'react';

export type ToastTone = 'default' | 'success' | 'error';

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = (): ToastItem[] => toasts;

export function toast(input: { title: string; description?: string; tone?: ToastTone }): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  toasts = [...toasts, { id, tone: 'default', ...input }];
  emit();
  return id;
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
