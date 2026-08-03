// Execution-status style map, shared between the server page (badge) and
// the client controls. Kept in a plain module (no 'use client') so a
// server component can read the object directly.
export const EXEC_STATUSES = [
  'scheduled',
  'ready',
  'in_progress',
  'completed',
  'delayed',
  'cancelled',
  'moved',
] as const;

export type ExecStatus = (typeof EXEC_STATUSES)[number];

export const EXEC_STATUS_STYLE: Record<string, string> = {
  scheduled: 'bg-muted text-muted-foreground',
  ready: 'bg-secondary text-secondary-foreground',
  in_progress: 'bg-accent/15 text-accent',
  completed: 'bg-green-vibrant/15 text-green-vibrant',
  delayed: 'bg-amber-500/15 text-amber-700',
  cancelled: 'bg-destructive/10 text-destructive',
  moved: 'bg-amber-500/15 text-amber-700',
};
