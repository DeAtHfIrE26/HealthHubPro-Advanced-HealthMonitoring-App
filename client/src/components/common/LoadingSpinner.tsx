import { Spinner } from '@/components/ui/spinner';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

const LoadingSpinner = ({ size = 'md', message, className }: LoadingSpinnerProps) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <Spinner size={size} />
      {message && (
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;