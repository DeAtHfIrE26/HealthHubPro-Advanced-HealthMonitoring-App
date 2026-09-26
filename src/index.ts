/**
 * Public surface of the library.
 *
 * Everything here is presentational or a pure function. There is no API
 * client, no schema and no server code — see README "What is open and what
 * is not" for where the line sits and why.
 */

// Types the components read.
export type {
  ActivityStat,
  GoalProgress,
  GoalType,
  ImportDay,
  ParseIssue,
  ParseOutcome,
} from './types';
export { METRIC_LABELS, IMPORT_MAX_DAYS } from './types';

// Data display.
export { ActivityChart } from './components/data/ActivityChart';
export { GoalRing } from './components/data/GoalRing';
export { StatTile } from './components/data/StatTile';

// Loading, empty, error and offline states.
export { ErrorBoundary } from './components/common/ErrorBoundary';
export { EmptyState, ErrorState, OfflineBanner } from './components/common/States';

// UI primitives.
export { Alert } from './components/ui/alert';
export { Avatar, AvatarFallback } from './components/ui/avatar';
export { Badge } from './components/ui/badge';
export { Button } from './components/ui/button';
export { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
export {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog';
export { Input } from './components/ui/input';
export { Label } from './components/ui/label';
export { Skeleton } from './components/ui/skeleton';
export { Toaster } from './components/ui/toaster';

// Hooks.
export { useCountUp } from './hooks/useCountUp';
export { useIsMobile } from './hooks/use-mobile';
export { useOnlineStatus } from './hooks/useOnlineStatus';
export { useTheme } from './hooks/useTheme';
export { dismissToast, toast, useToasts } from './hooks/use-toast';
export type { ToastItem, ToastTone } from './hooks/use-toast';

// Formatting and class utilities.
export {
  formatDaysLeft,
  formatDecimal,
  formatDuration,
  formatNumber,
  formatRelativeDay,
  formatShortDate,
  formatWeekday,
  initials,
  parseIsoDate,
  todayIso,
} from './lib/format';
export { cn } from './lib/utils';

// Streaming parsers for health exports.
export { DayAccumulator, streamText } from './lib/import/aggregate';
export type { Metric } from './lib/import/aggregate';
export { parseAppleHealth } from './lib/import/appleHealth';
export { detectFormat, parseCsv } from './lib/import/csv';
