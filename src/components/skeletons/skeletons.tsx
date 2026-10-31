import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { dict } from '@/lib/dictionary';

function LoadingStatus() {
  return (
    <span role="status" className="sr-only">
      {dict.common.loading}
    </span>
  );
}

/**
 * A single skeleton shown on its own inside real content. The delay needs a wrapper,
 * because skeleton-reveal and skeleton-pulse can't share an element: both set the animation property.
 */
export function InlineSkeleton({ className }: { className?: string }) {
  return (
    <div className="skeleton-reveal">
      <Skeleton className={className} />
    </div>
  );
}

export function StatCardsSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Card
          key={i}
          className={cn(
            'p-4 bg-card border shadow-xs',
            i === 2 && 'col-span-2 sm:col-span-1',
          )}
        >
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-12 mt-1" />
        </Card>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="skeleton-reveal flex min-h-screen flex-col bg-background">
      <LoadingStatus />
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-4 sm:px-6">
        <Skeleton className="h-5 w-48" />
        <div className="flex items-center gap-2 sm:gap-3">
          <Skeleton className="size-8" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b">
          <div>
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-4 w-72 max-w-full mt-1" />
          </div>
          <Skeleton className="h-8 w-40" />
        </div>

        <StatCardsSkeleton />

        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-24" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="flex flex-col justify-between p-5 bg-card border">
              <div>
                <Skeleton className="h-5 w-16 mb-2" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full mt-1" />
              </div>
              <div className="mt-6 pt-3 border-t flex items-center justify-between">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-14" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuestionCardSkeleton() {
  return (
    <Card className="p-6 shadow-sm border bg-card">
      <div className="flex items-center justify-between gap-3 mb-4">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-8 w-44 shrink-0" />
      </div>
      <Skeleton className="h-9 w-full" />
      <div className="mt-6 pt-4 border-t flex items-center justify-between">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-32" />
      </div>
    </Card>
  );
}

export function BuilderSkeleton() {
  return (
    <div className="skeleton-reveal flex h-dvh flex-col bg-background overflow-hidden">
      <LoadingStatus />
      <div className="sticky top-0 z-30 flex flex-col border-b bg-background/95">
        <div className="flex h-14 items-center justify-between px-3 sm:px-6">
          <Skeleton className="h-6 w-40 sm:w-56" />
          <Skeleton className="hidden md:block h-8 w-16" />
          <Skeleton className="h-8 w-20 md:w-64" />
        </div>
        <div className="flex h-10 items-center gap-6 border-t px-4 sm:px-6 bg-muted/20">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-muted/30 p-4 md:p-8">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          <Card className="rounded-xl border bg-card shadow-sm p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-14 w-full" />
          </Card>
          <QuestionCardSkeleton />
          <QuestionCardSkeleton />
        </div>
      </div>
    </div>
  );
}

export function PublicFormSkeleton() {
  return (
    <div className="skeleton-reveal min-h-screen bg-muted/20 px-4 py-8 sm:px-6">
      <LoadingStatus />
      <div className="mx-auto max-w-2xl flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-8" />
      </div>
      <div className="mx-auto max-w-2xl space-y-4">
        <Card className="rounded-xl border bg-card shadow-sm p-6 sm:p-8">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-full mt-3" />
          <Skeleton className="h-4 w-40 mt-9" />
        </Card>
        {[0, 1, 2].map((i) => (
          <Card key={i} className="p-6 bg-card shadow-sm border">
            <Skeleton className="h-6 w-1/2 mb-4" />
            <Skeleton className="h-9 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ResponsesTableSkeleton() {
  return (
    <div className="skeleton-reveal space-y-4">
      <LoadingStatus />
      <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
        <div className="h-10 border-b bg-muted/40 flex items-center px-3">
          <Skeleton className="h-4 w-1/3" />
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex h-11 items-center gap-6 border-b last:border-b-0 px-3">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}
