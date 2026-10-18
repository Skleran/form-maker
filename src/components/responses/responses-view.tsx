'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  Calendar,
  Layers,
  Loader2,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
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
import { ResponseDetailSheet } from './response-detail-sheet';
import { ExportCsvButton } from './export-csv-button';
import { useLanguage } from '@/lib/i18n/language-context';

interface ResponsesViewProps {
  formId: string;
}

export function ResponsesView({ formId }: ResponsesViewProps) {
  const { dict, language } = useLanguage();
  const [data, setData] = React.useState<PaginatedResponsesResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
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
          setCurrentPage(page);
        } else {
          toast.error(res.error || 'Yanıtlar yüklenemedi');
        }
      } catch {
        toast.error('Yanıtlar yüklenemedi');
      } finally {
        setIsLoading(false);
      }
    },
    [formId],
  );

  React.useEffect(() => {
    let ignore = false;
    getFormResponses(formId, 1, 10).then((res) => {
      if (!ignore) {
        if (res.success && res.data) {
          setData(res.data);
        }
        setIsLoading(false);
      }
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

    // If currently inspecting this submission, close the sheet
    if (selectedSubmission?.id === idToDelete) {
      setIsSheetOpen(false);
      setSelectedSubmission(null);
    }

    setIsDeleting(true);
    try {
      const res = await deleteSubmission(idToDelete, formId);
      if (res.success) {
        toast.success(dict.responses.deleteSuccess);
        // Background sync to keep pagination totals fresh
        getFormResponses(formId, currentPage, 10).then((refreshRes) => {
          if (refreshRes.success && refreshRes.data) {
            setData(refreshRes.data);
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

  const locale = language === 'tr' ? 'tr-TR' : 'en-US';

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 bg-muted/15 min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {dict.responses.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {dict.responses.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadResponses(currentPage)}
              disabled={isLoading}
              className="cursor-pointer gap-1.5 text-xs font-medium"
              title={dict.responses.refresh}
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

        {/* Aggregate Stats Cards */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
          <Card className="p-4 bg-card border shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <MessageSquare className="size-3.5 text-primary" />
              <span>{dict.responses.totalResponses}</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {data?.totalCount ?? 0}
            </p>
          </Card>

          <Card className="p-4 bg-card border shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Layers className="size-3.5 text-primary" />
              <span>{dict.responses.questionFields}</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {data?.questions.length ?? 0}
            </p>
          </Card>

          <Card className="p-4 bg-card border shadow-sm col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Calendar className="size-3.5 text-primary" />
              <span>{dict.responses.latestActivity}</span>
            </div>
            <p className="text-xs font-medium text-foreground mt-2 truncate">
              {data?.submissions[0]
                ? new Date(data.submissions[0].submittedAt).toLocaleString(
                    locale,
                    {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    },
                  )
                : dict.responses.noSubmissionsYet}
            </p>
          </Card>
        </div>

        {/* Responses Table / Loading */}
        {isLoading && !data ? (
          <div className="flex h-64 items-center justify-center rounded-lg border bg-card">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-xs">{dict.responses.loadingResponses}</span>
            </div>
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

        {/* Detail Inspection Sheet */}
        <ResponseDetailSheet
          formId={formId}
          submission={selectedSubmission}
          isOpen={isSheetOpen}
          onClose={() => {
            setIsSheetOpen(false);
            setSelectedSubmission(null);
          }}
          onDeleted={() => loadResponses(currentPage)}
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
                {language === 'tr' ? 'İptal' : 'Cancel'}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmDeleteSubmission}
                disabled={isDeleting}
                className="gap-1.5"
              >
                {isDeleting && <Loader2 className="size-3.5 animate-spin" />}
                <span>{language === 'tr' ? 'Sil' : 'Delete'}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
