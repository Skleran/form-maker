"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Calendar,
  Layers,
  Loader2,
  MessageSquare,
  RefreshCw,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  getFormResponses,
  deleteSubmission,
  type FormSubmissionRow,
  type PaginatedResponsesResult,
} from "@/actions/response-actions"
import { ResponsesTable } from "./responses-table"
import { ResponseDetailSheet } from "./response-detail-sheet"
import { ExportCsvButton } from "./export-csv-button"

interface ResponsesViewProps {
  formId: string
}

export function ResponsesView({ formId }: ResponsesViewProps) {
  const [data, setData] = React.useState<PaginatedResponsesResult | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [selectedSubmission, setSelectedSubmission] =
    React.useState<FormSubmissionRow | null>(null)
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)

  const loadResponses = React.useCallback(
    async (page: number = 1) => {
      setIsLoading(true)
      try {
        const res = await getFormResponses(formId, page, 10)
        if (res.success) {
          setData(res.data)
          setCurrentPage(page)
        } else {
          toast.error(res.error || "Failed to load responses")
        }
      } catch {
        toast.error("Failed to load responses")
      } finally {
        setIsLoading(false)
      }
    },
    [formId]
  )

  React.useEffect(() => {
    let ignore = false
    getFormResponses(formId, 1, 10).then((res) => {
      if (!ignore) {
        if (res.success && res.data) {
          setData(res.data)
        }
        setIsLoading(false)
      }
    })
    return () => {
      ignore = true
    }
  }, [formId])

  const handleDelete = async (submissionId: string) => {
    if (!confirm("Are you sure you want to delete this submission?")) return

    try {
      const res = await deleteSubmission(submissionId, formId)
      if (res.success) {
        toast.success("Submission deleted")
        loadResponses(currentPage)
      } else {
        toast.error(res.error || "Failed to delete submission")
      }
    } catch {
      toast.error("Failed to delete submission")
    }
  }

  const handleInspect = (sub: FormSubmissionRow) => {
    setSelectedSubmission(sub)
    setIsSheetOpen(true)
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 bg-muted/15 min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Collected Responses
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Inspect submitted answers, view uploaded attachments, and export data.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadResponses(currentPage)}
              disabled={isLoading}
              className="cursor-pointer gap-1.5 text-xs font-medium"
              title="Refresh responses"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
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
              <span>Total Responses</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {data?.totalCount ?? 0}
            </p>
          </Card>

          <Card className="p-4 bg-card border shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Layers className="size-3.5 text-primary" />
              <span>Question Fields</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {data?.questions.length ?? 0}
            </p>
          </Card>

          <Card className="p-4 bg-card border shadow-sm col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Calendar className="size-3.5 text-primary" />
              <span>Latest Activity</span>
            </div>
            <p className="text-xs font-medium text-foreground mt-2 truncate">
              {data?.submissions[0]
                ? new Date(data.submissions[0].submittedAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "No submissions yet"}
            </p>
          </Card>
        </div>

        {/* Responses Table / Loading */}
        {isLoading && !data ? (
          <div className="flex h-64 items-center justify-center rounded-lg border bg-card">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-xs">Loading responses...</span>
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
            setIsSheetOpen(false)
            setSelectedSubmission(null)
          }}
          onDeleted={() => loadResponses(currentPage)}
        />
      </div>
    </div>
  )
}
