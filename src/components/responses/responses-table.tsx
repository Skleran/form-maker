"use client"

import * as React from "react"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Paperclip,
  Trash2,
} from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import type { FormSubmissionRow } from "@/actions/response-actions"
import { useLanguage } from "@/lib/i18n/language-context"

interface ResponsesTableProps {
  questions: Array<{ id: string; label: string; type: string }>
  submissions: FormSubmissionRow[]
  totalCount: number
  currentPage: number
  totalPages: number
  onPageChange: (newPage: number) => void
  onInspect: (submission: FormSubmissionRow) => void
  onDelete: (submissionId: string) => void
}

export function ResponsesTable({
  questions,
  submissions,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  onInspect,
  onDelete,
}: ResponsesTableProps) {
  const { dict, language } = useLanguage()
  // Show first 3 questions as table preview columns
  const previewQuestions = questions.slice(0, 3)

  if (submissions.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center p-12 text-center bg-card border border-dashed">
        <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <FileText className="size-6 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold text-foreground">
          {dict.responses.noResponsesTitle}
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          {dict.responses.noResponsesDesc}
        </p>
      </Card>
    )
  }

  const locale = language === "tr" ? "tr-TR" : "en-US"

  return (
    <div className="space-y-4">
      {/* Table Container */}
      <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-16 font-semibold">#</TableHead>
              <TableHead className="w-44 font-semibold">{dict.responses.colSubmittedAt}</TableHead>
              {previewQuestions.map((q) => (
                <TableHead key={q.id} className="max-w-[200px] truncate font-semibold">
                  {q.label}
                </TableHead>
              ))}
              <TableHead className="w-24 text-center font-semibold">{dict.responses.colFiles}</TableHead>
              <TableHead className="w-28 text-right font-semibold">{dict.responses.colActions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((sub, index) => {
              const rowIndex = (currentPage - 1) * 10 + index + 1
              const hasAttachment = sub.answers.some((a) => a.fileUrl || a.questionType === "FILE_UPLOAD")

              return (
                <TableRow
                  key={sub.id}
                  onClick={() => onInspect(sub)}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    #{rowIndex}
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3 text-primary shrink-0" />
                      {new Date(sub.submittedAt).toLocaleString(locale, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </TableCell>

                  {/* Dynamic Question Answers preview */}
                  {previewQuestions.map((q) => {
                    const ans = sub.answersMap[q.id]
                    const displayText = ans?.text || (Array.isArray(ans?.json) ? (ans.json as string[]).join(", ") : "-")

                    return (
                      <TableCell key={q.id} className="text-xs text-foreground max-w-[200px] truncate">
                        {displayText}
                      </TableCell>
                    )
                  })}

                  {/* Attachment indicator */}
                  <TableCell className="text-center">
                    {hasAttachment ? (
                      <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
                        <Paperclip className="size-3" />
                        {dict.responses.badgeFile}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onInspect(sub)}
                        className="cursor-pointer text-muted-foreground hover:text-foreground"
                        title={dict.responses.inspectTooltip}
                      >
                        <Eye className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onDelete(sub.id)}
                        className="cursor-pointer text-muted-foreground hover:text-destructive"
                        title={dict.responses.deleteTooltip}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
        <div>
          {language === "tr"
            ? `${totalCount} yanıttan ${submissions.length} tanesi gösteriliyor`
            : `Showing ${submissions.length} of ${totalCount} ${totalCount === 1 ? "submission" : "submissions"}`}
        </div>

        <div className="flex items-center gap-2">
          <span>
            {dict.responses.pageOf
              .replace("{page}", String(currentPage))
              .replace("{pages}", String(totalPages))}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-xs"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="cursor-pointer"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="cursor-pointer"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
