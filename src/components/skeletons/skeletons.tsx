import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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

export function DashboardSkeleton() {
  return (
    <div className="skeleton-reveal flex min-h-screen flex-col bg-background">
      <LoadingStatus />
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-4 sm:px-6">
        <Skeleton className="h-5 w-40" />
        <div className="flex items-center gap-1">
          <Skeleton className="size-8" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-32 sm:h-9" />
            <Skeleton className="h-4 w-48 max-w-full mt-1.5" />
          </div>
          <Skeleton className="h-9 w-40" />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-8 w-full sm:w-64" />
        </div>

        <div className="mt-4 overflow-hidden rounded-md border">
          <div className="flex h-9 items-center border-b px-4">
            <Skeleton className="h-3.5 w-16" />
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex h-16 items-center justify-between gap-6 border-b px-4 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="h-3.5 w-36 max-w-full mt-1.5" />
              </div>
              <Skeleton className="hidden h-4 w-16 sm:block" />
              <Skeleton className="hidden h-4 w-24 md:block" />
              <Skeleton className="h-7 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuestionCardSkeleton() {
  return (
    <Card className="gap-0 px-4 pt-7 pb-4 sm:px-6 sm:pb-5 pointer-coarse:pt-9">
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
        <div className="flex h-10 items-center gap-6 border-t px-4 sm:px-6">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-background p-4 md:p-8">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          <Card className="p-6 space-y-4">
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
    <div className="skeleton-reveal min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-8">
      <LoadingStatus />
      <div className="mx-auto max-w-xl flex items-center justify-between mb-8">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-8" />
      </div>
      <div className="mx-auto max-w-xl">
        <div className="pb-8">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-full mt-3" />
          <Skeleton className="h-4 w-40 mt-4" />
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="grid grid-cols-[2rem_minmax(0,1fr)] border-t py-6 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:py-8"
          >
            <Skeleton className="h-4 w-4" />
            <div>
              <Skeleton className="h-6 w-1/2 mb-3" />
              <Skeleton className="h-11 w-full sm:h-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResponsesTableSkeleton() {
  return (
    <div className="skeleton-reveal space-y-4">
      <LoadingStatus />
      <div className="rounded-md border overflow-hidden">
        <div className="h-10 border-b flex items-center px-3">
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
