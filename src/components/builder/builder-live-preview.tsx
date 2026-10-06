"use client"

import * as React from "react"
import { useFormContext } from "react-hook-form"
import { Eye, Smartphone, Laptop, Upload, CheckCircle2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useBuilderStore } from "@/stores/use-builder-store"
import type { FormBuilderValues } from "@/lib/validations/form"
import { cn } from "@/lib/utils"

export function BuilderLivePreview() {
  const { isLivePreview, setIsLivePreview } = useBuilderStore()
  const { watch } = useFormContext<FormBuilderValues>()
  const formValues = watch()

  const [previewDevice, setPreviewDevice] = React.useState<"desktop" | "mobile">("desktop")
  const [submitted, setSubmitted] = React.useState(false)

  const handleReset = () => {
    setSubmitted(false)
  }

  return (
    <Dialog open={isLivePreview} onOpenChange={setIsLivePreview}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 flex flex-col gap-0">
        {/* Preview Header */}
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between sticky top-0 bg-background z-10">
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-primary" />
            <DialogTitle className="text-sm font-semibold">Respondent Live Preview</DialogTitle>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground border">
              Simulation Mode
            </span>
          </div>

          <div className="flex items-center gap-2 pr-6">
            <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
              <Button
                variant={previewDevice === "desktop" ? "secondary" : "ghost"}
                size="icon-xs"
                onClick={() => setPreviewDevice("desktop")}
                className="cursor-pointer"
              >
                <Laptop className="size-3.5" />
              </Button>
              <Button
                variant={previewDevice === "mobile" ? "secondary" : "ghost"}
                size="icon-xs"
                onClick={() => setPreviewDevice("mobile")}
                className="cursor-pointer"
              >
                <Smartphone className="size-3.5" />
              </Button>
            </div>
            {submitted && (
              <Button variant="outline" size="xs" onClick={handleReset} className="cursor-pointer">
                Reset Preview
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Preview Canvas Area */}
        <div className="p-6 sm:p-10 bg-muted/30 flex-1 overflow-y-auto">
          <div
            className={cn(
              "mx-auto space-y-4 transition-all duration-300",
              previewDevice === "mobile" ? "max-w-sm" : "max-w-2xl"
            )}
          >
            {submitted ? (
              <Card className="p-8 text-center bg-card shadow-sm border space-y-3">
                <CheckCircle2 className="size-12 text-emerald-500 mx-auto" />
                <h3 className="text-xl font-bold text-foreground">Response Submitted</h3>
                <p className="text-sm text-muted-foreground">
                  Your response has been recorded. This was a live simulation preview.
                </p>
                <Button size="sm" onClick={handleReset} className="mt-4 cursor-pointer">
                  Submit another response
                </Button>
              </Card>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setSubmitted(true)
                }}
                className="space-y-4"
              >
                {/* Form Title & Description Card */}
                <Card className="border-t-4 border-t-primary p-6 shadow-sm bg-card">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {formValues.title || "Untitled Form"}
                  </h1>
                  {formValues.description && (
                    <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                      {formValues.description}
                    </p>
                  )}
                  <div className="mt-4 pt-3 border-t text-xs text-destructive font-medium">
                    * Indicates required question
                  </div>
                </Card>

                {/* Question Cards */}
                {(formValues.questions || []).map((q, idx) => (
                  <Card key={q.id || idx} className="p-6 shadow-sm bg-card border">
                    <div className="space-y-1.5 mb-4">
                      <label className="text-sm font-semibold text-foreground flex items-baseline gap-1">
                        <span>{q.label || `Question ${idx + 1}`}</span>
                        {q.required && <span className="text-destructive">*</span>}
                      </label>
                      {q.config?.description && (
                        <p className="text-xs text-muted-foreground">{q.config.description}</p>
                      )}
                    </div>

                    {/* Inputs based on type */}
                    {q.type === "SHORT_TEXT" && (
                      <Input
                        required={q.required}
                        placeholder={q.config?.placeholder || "Your answer"}
                        className="text-sm"
                      />
                    )}

                    {q.type === "LONG_TEXT" && (
                      <Textarea
                        required={q.required}
                        rows={3}
                        placeholder={q.config?.placeholder || "Your answer"}
                        className="text-sm resize-none"
                      />
                    )}

                    {q.type === "SINGLE_CHOICE" && (
                      <div className="space-y-2">
                        {(q.options || []).map((opt) => (
                          <label
                            key={opt.id}
                            className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer"
                          >
                            <input
                              type="radio"
                              name={`sim_${q.id}`}
                              required={q.required}
                              className="size-4 accent-primary"
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === "MULTIPLE_CHOICE" && (
                      <div className="space-y-2">
                        {(q.options || []).map((opt) => (
                          <label
                            key={opt.id}
                            className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer"
                          >
                            <input type="checkbox" className="size-4 accent-primary rounded" />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === "DROPDOWN" && (
                      <Select>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose an option" />
                        </SelectTrigger>
                        <SelectContent>
                          {(q.options || []).map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {q.type === "FILE_UPLOAD" && (
                      <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 text-center bg-muted/10">
                        <Upload className="size-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs font-medium text-foreground">
                          Click or drag file to simulate upload
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Max size: {q.config?.maxFileSizeMb || 10} MB
                        </p>
                      </div>
                    )}
                  </Card>
                ))}

                <div className="flex justify-between items-center pt-2">
                  <Button type="submit" className="cursor-pointer shadow-sm">
                    Submit Simulation
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsLivePreview(false)}
                    className="text-muted-foreground cursor-pointer"
                  >
                    Close Preview
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
