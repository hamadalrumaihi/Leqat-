'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// shadcn/ui-style Dialog, adapted to the app's tokens and RTL. Copied
// into the repo (not a black-box dependency); no separate design system.
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" />
      <DialogPrimitive.Content
        className={cn(
          'fixed start-1/2 top-1/2 z-50 max-h-[90vh] w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border bg-card p-5 shadow-xl rtl:translate-x-1/2',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute end-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="close"
        >
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 pe-6">{children}</div>;
}
