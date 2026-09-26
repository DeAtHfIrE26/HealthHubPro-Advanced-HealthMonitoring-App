import { dismissToast, useToasts } from '../../hooks/use-toast';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './toast';

export function Toaster() {
  const toasts = useToasts();

  return (
    <ToastProvider swipeDirection="right" duration={5000}>
      {toasts.map(({ id, title, description, tone }) => (
        <Toast
          key={id}
          tone={tone}
          onOpenChange={(open) => {
            if (!open) dismissToast(id);
          }}
        >
          <div className="min-w-0 flex-1">
            <ToastTitle>{title}</ToastTitle>
            {description ? <ToastDescription>{description}</ToastDescription> : null}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
