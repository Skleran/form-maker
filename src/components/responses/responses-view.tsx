'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';

import {
  InlineSkeleton,
  ResponsesTableSkeleton,
} from '@/components/skeletons/skeletons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getFormResponses,
  deleteSubmission,
  type FormSubmissionRow,
  type PaginatedResponsesResult,
} from '@/actions/response-actions';
import { ResponsesTable } from './responses-table';
import { ExportCsvButton } from './export-csv-button';
import { dict } from '@/lib/dictionary';
import { ResponseDetailDrawer } from './response-detail-drawer';

interface ResponsesViewProps {
  formId: string;
}

export function ResponsesView({ formId }: ResponsesViewProps) {
  const [data, setData] = React.useState<PaginatedResponsesResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [initialLoadFailed, setInitialLoadFailed] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selectedSubmission, setSelectedSubmission] =
    React.useState<FormSubmissionRow | null>(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [submissionToDelete, setSubmissionToDelete] = React.useState<
    string | null
  >(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const loadResponses = React.useCallback(
    async (page: number = 1) => {
      setIsLoading(true);
      try {
        const res = await getFormResponses(formId, page, 10);
        if (res.success) {
          setData(res.data);
          setCurrentPage(res.data.currentPage);
        } else {
          toast.error(res.error || dict.responses.loadFailed);
        }
      } catch {
        toast.error(dict.responses.loadFailed);
      } finally {
        setIsLoading(false);
      }
    },
    [formId],
  );

  React.useEffect(() => {
    let ignore = false;
    getFormResponses(formId, 1, 10)
      .then((res) => {
        if (ignore) return;
        if (res.success) {
          setData(res.data);
        } else {
          setInitialLoadFailed(true);
        }
      })
      .catch(() => {
        if (!ignore) setInitialLoadFailed(true);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [formId]);

  const handleDelete = (submissionId: string) => {
    setSubmissionToDelete(submissionId);
  };

  const confirmDeleteSubmission = async () => {
    if (!submissionToDelete) return;
    const idToDelete = submissionToDelete;
    setSubmissionToDelete(null);

    // 1. Optimistic Update: immediately remove from UI!
    const previousData = data;
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        submissions: prev.submissions.filter((item) => item.id !== idToDelete),
        totalCount: Math.max(0, prev.totalCount - 1),
      };
    });

    // If currently inspecting this submission, close the drawer smoothly
    if (selectedSubmission?.id === idToDelete) {
      setIsSheetOpen(false);
    }

    setIsDeleting(true);
    try {
      const res = await deleteSubmission(idToDelete, formId);
      if (res.success) {
        // Background sync to keep pagination totals fresh
        getFormResponses(formId, currentPage, 10).then((refreshRes) => {
          if (refreshRes.success && refreshRes.data) {
            setData(refreshRes.data);
            setCurrentPage(refreshRes.data.currentPage);
          }
        });
      } else {
        // Rollback on failure
        setData(previousData);
        toast.error(res.error || dict.responses.deleteFailed);
      }
    } catch {
      // Rollback on network error
      setData(previousData);
      toast.error(dict.responses.deleteFailed);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInspect = (sub: FormSubmissionRow) => {
    setSelectedSubmission(sub);
    setIsSheetOpen(true);
  };

  const locale = 'tr-TR';

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 bg-background min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {dict.responses.title}
            </h2>
            {!data && isLoading ? (
              <InlineSkeleton className="h-4 w-56 mt-1.5" />
            ) : (
              <p className="text-sm tabular-nums text-muted-foreground mt-1">
                {dict.responses.summary
                  .replace('{responses}', String(data?.totalCount ?? 0))
                  .replace('{questions}', String(data?.questions.length ?? 0))}
                {' · '}
                {data?.latestSubmittedAt
                  ? `${dict.responses.latestActivity}: ${new Date(
                      data.latestSubmittedAt,
                    ).toLocaleString(locale, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : dict.responses.noSubmissionsYet}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadResponses(currentPage)}
              disabled={isLoading}
              className="cursor-pointer gap-1.5 text-xs font-medium"
            >
              <RefreshCw
                className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`}
              />
              <span>{dict.responses.refresh}</span>
            </Button>

            <ExportCsvButton
              formId={formId}
              disabled={!data || data.totalCount === 0}
            />
          </div>
        </div>

        {/* Responses Table / Loading */}
        {isLoading && !data ? (
          <ResponsesTableSkeleton />
        ) : !data && initialLoadFailed ? (
          <div className="flex h-64 items-center justify-center rounded-lg border bg-card text-xs text-destructive">
            {dict.responses.loadFailed}
          </div>
        ) : (
          <ResponsesTable
            questions={data?.questions || []}
            submissions={data?.submissions || []}
            totalCount={data?.totalCount || 0}
            currentPage={currentPage}
            totalPages={data?.totalPages || 1}
            onPageChange={(p) => loadResponses(p)}
            onInspect={handleInspect}
            onDelete={handleDelete}
          />
        )}

        {/* Detail Inspection Drawer */}
        <ResponseDetailDrawer
          submission={selectedSubmission}
          isOpen={isSheetOpen}
          onClose={() => {
            setIsSheetOpen(false);
          }}
          onDeleteRequest={(id) => setSubmissionToDelete(id)}
        />

        {/* Shadcn Confirmation Dialog for Submission Deletion */}
        <Dialog
          open={Boolean(submissionToDelete)}
          onOpenChange={(open) => !open && setSubmissionToDelete(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{dict.responses.deleteSubmission}</DialogTitle>
              <DialogDescription>
                {dict.responses.deleteConfirm}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSubmissionToDelete(null)}
                disabled={isDeleting}
              >
                İptal
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmDeleteSubmission}
                disabled={isDeleting}
                className="gap-1.5"
              >
                {isDeleting && <Loader2 className="size-3.5 animate-spin" />}
                <span>Sil</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
