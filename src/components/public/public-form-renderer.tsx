'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  CheckCircle2,
  FileText,
  Loader2,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Hint } from '@/components/hint';
import { ThemeToggle } from '@/components/theme-toggle';
import { buildDynamicFormSchema } from '@/lib/validations/dynamic-schema';
import { submitFormResponse } from '@/actions/submission-actions';
import type { QuestionFormItem, QuestionConfig } from '@/types/form';
import { dict } from '@/lib/dictionary';
import { useHydrated } from '@/hooks/use-hydrated';
import { QuestionIcon } from '@/components/form/question-icon';
import {
  formatAllowedFileTypes,
  formatFileLimitsDescription,
  getAcceptAttribute,
  isFileTypeAllowed,
} from '@/lib/file-types';
import { FormMakerLogo } from '../formmaker-logo';

const optionRowClass =
  'flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-md border border-input px-3 py-2 text-base text-foreground transition-colors hover:bg-muted/50 has-checked:border-foreground/25 has-checked:bg-muted sm:min-h-10 sm:text-sm';
const fieldSizeClass = 'h-11 text-base sm:h-10 md:text-sm';

interface FileUploadValue {
  name: string;
  size: number;
  type: string;
  token: string;
}

function deleteUploadedFile(file: FileUploadValue) {
  fetch('/api/upload', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: file.token }),
  }).catch((err) => console.warn('Failed to delete attachment:', err));
}

function PublicFileInput({
  formId,
  questionId,
  config,
  value,
  onChange,
  onUploadStateChange,
  labelledBy,
  describedBy,
}: {
  formId: string;
  questionId: string;
  labelledBy: string;
  describedBy?: string;
  config?: QuestionConfig;
  value: FileUploadValue | null;
  onChange: (val: FileUploadValue | null) => void;
  onUploadStateChange?: (isUploading: boolean) => void;
}) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(
    null,
  );
  // Previews the picked file locally: uploaded files aren't readable by respondents
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const processFile = (file: File) => {
    const maxMb = config?.maxFileSizeMb || 10;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(
        dict.publicForm.fileSizeExceeded
          .replace('{size}', (file.size / (1024 * 1024)).toFixed(2))
          .replace('{max}', String(maxMb)),
      );
      return;
    }

    if (config?.allowedMimeTypes && config.allowedMimeTypes.length > 0) {
      if (!isFileTypeAllowed(file, config.allowedMimeTypes)) {
        toast.error(
          dict.publicForm.fileTypeNotAllowed.replace(
            '{types}',
            formatAllowedFileTypes(config.allowedMimeTypes),
          ),
        );
        return;
      }
    }

    // If user replaces an already uploaded file, delete the old one from storage
    if (value) {
      deleteUploadedFile(value);
    }

    setPreviewUrl(null);
    setIsUploading(true);
    setUploadProgress(0);
    onUploadStateChange?.(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'submissions');
    formData.append('formId', formId);
    formData.append('questionId', questionId);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      setUploadProgress(null);
      onUploadStateChange?.(false);

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success && res.data) {
            onChange({
              name: res.data.name,
              size: res.data.size || file.size,
              type: res.data.type || file.type,
              token: res.data.token,
            });
            if (/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
              setPreviewUrl(URL.createObjectURL(file));
            }
          } else {
            toast.error(res.error || dict.publicForm.uploadFailed);
          }
        } catch {
          toast.error(dict.publicForm.uploadFailed);
        }
      } else {
        let errMsg = dict.publicForm.uploadFailed;
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.error) errMsg = res.error;
        } catch {}
        toast.error(errMsg);
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setUploadProgress(null);
      onUploadStateChange?.(false);
      toast.error(dict.publicForm.uploadFailed);
    };

    xhr.send(formData);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  if (isUploading) {
    return (
      <div
        role="status"
        className="flex flex-col items-center justify-center rounded-md border border-dashed border-muted-foreground/50 p-6 text-center space-y-3"
      >
        <Loader2 className="size-5 text-muted-foreground animate-spin" />
        <div className="space-y-1.5 w-full max-w-xs">
          <span className="text-sm tabular-nums text-foreground">
            {dict.publicForm.uploadProgress.replace(
              '{percent}',
              String(uploadProgress ?? 0),
            )}
          </span>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-150"
              style={{ width: `${uploadProgress ?? 0}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (value) {
    return (
      <div className="space-y-3">
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-input px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="size-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground truncate">
              {value.name}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground shrink-0">
              ({(value.size / (1024 * 1024)).toFixed(2)} MB)
            </span>
          </div>
          <Hint label={dict.publicForm.removeAttachment}>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                deleteUploadedFile(value);
                setPreviewUrl(null);
                onChange(null);
              }}
              className="cursor-pointer text-muted-foreground hover:text-destructive"
              aria-label={dict.publicForm.removeAttachment}
            >
              <X className="size-3.5" />
            </Button>
          </Hint>
        </div>

        {previewUrl && (
          <div className="overflow-hidden rounded-md border bg-muted/10 p-2 flex items-center justify-center max-h-48">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={value.name}
              className="max-h-44 w-auto rounded object-contain shadow-sm"
            />
          </div>
        )}
      </div>
    );
  }

  const dropzoneTextId = `${labelledBy}-dropzone`;

  return (
    <button
      type="button"
      data-focus-target
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      aria-labelledby={`${labelledBy} ${dropzoneTextId}`}
      aria-describedby={describedBy}
      className={`flex w-full flex-col items-center justify-center rounded-md border border-dashed p-6 text-center cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isDragging
          ? 'border-foreground bg-muted'
          : 'border-muted-foreground/50 hover:border-foreground/60 hover:bg-muted/50'
      }`}
    >
      <Upload aria-hidden="true" className="size-5 mb-2 text-muted-foreground" />
      <span id={dropzoneTextId} className="text-sm text-foreground">
        {isDragging
          ? 'Dosyayı eklemek için bırakın'
          : dict.publicForm.clickOrDrop}
      </span>
      <span className="text-xs text-muted-foreground mt-1">
        {formatFileLimitsDescription(
          config?.maxFileSizeMb,
          config?.allowedMimeTypes,
        )}
      </span>
      <input
        ref={inputRef}
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
          e.target.value = '';
        }}
        accept={getAcceptAttribute(config?.allowedMimeTypes)}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
      />
    </button>
  );
}

function PreviewBanner({
  formId,
  isPublished,
  notice,
}: {
  formId: string;
  isPublished: boolean;
  notice: string;
}) {
  const router = useRouter();
  const builderUrl = `/admin/forms/${formId}/edit`;

  return (
    <div className="sticky top-0 z-50 border-b border-amber-500/30 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-50">
      <div className="flex min-h-11 items-center justify-between gap-4 px-4 py-2 text-sm sm:px-6">
        <p className="min-w-0">
          <span className="font-medium">{dict.publicForm.previewBanner}</span>
          <span className="ml-2 text-amber-800 dark:text-amber-200">
            {isPublished
              ? dict.publicForm.statusLive
              : dict.publicForm.statusDraft}
          </span>
          <span className="mt-0.5 block text-xs text-amber-800 sm:ml-3 sm:mt-0 sm:inline dark:text-amber-200">
            {notice}
          </span>
        </p>
        <a
          href={builderUrl}
          onClick={(e) => {
            e.preventDefault();
            // The builder opens previews in their own tab, so closing returns to it.
            // Browsers refuse this for a tab with history, so fall back to going there.
            window.close();
            window.setTimeout(() => router.push(builderUrl), 150);
          }}
          className="shrink-0 rounded-sm font-medium underline underline-offset-4 outline-none transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-amber-600"
        >
          {dict.publicForm.backToBuilder}
        </a>
      </div>
    </div>
  );
}

interface PublicFormRendererProps {
  form: {
    id: string;
    title: string;
    description: string | null;
    headerImage?: string | null;
    slug: string;
    isPublished: boolean;
    questions: QuestionFormItem[];
  };
  isPreview?: boolean;
}

export function PublicFormRenderer({
  form,
  isPreview = false,
}: PublicFormRendererProps) {
  const isHydrated = useHydrated();
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [uploadingCount, setUploadingCount] = React.useState(0);
  const [isClearDialogOpen, setIsClearDialogOpen] = React.useState(false);

  const handleUploadStateChange = React.useCallback((isUploading: boolean) => {
    setUploadingCount((prev) => Math.max(0, prev + (isUploading ? 1 : -1)));
  }, []);

  // Build the dynamic Zod schema for this form's specific questions
  const dynamicSchema = React.useMemo(() => {
    return buildDynamicFormSchema(form.questions);
  }, [form.questions]);

  // Initialize React Hook Form with dynamic resolver
  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    formState: { errors },
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(dynamicSchema),
    shouldFocusError: false,
    defaultValues: form.questions.reduce(
      (acc, q) => {
        if (q.type === 'MULTIPLE_CHOICE') {
          acc[q.id] = [];
        } else if (q.type === 'FILE_UPLOAD') {
          acc[q.id] = null;
        } else {
          acc[q.id] = '';
        }
        return acc;
      },
      {} as Record<string, unknown>,
    ),
  });

  const onSubmit = async (
    values: Record<string, unknown>,
    event?: React.BaseSyntheticEvent,
  ) => {
    const honeypot = event
      ? String(
          new FormData(event.target as HTMLFormElement).get('website') ?? '',
        )
      : '';

    if (uploadingCount > 0) {
      toast.warning(
        'Lütfen dosya yüklemesinin tamamlanmasını bekleyin.',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (isPreview) {
        await new Promise((r) => setTimeout(r, 600));
        setIsSubmitted(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const res = await submitFormResponse(
        form.id,
        values,
        honeypot,
      );

      if (res.success) {
        setIsSubmitted(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast.error(res.error || dict.publicForm.submissionFailed);
      }
    } catch {
      toast.error(dict.publicForm.networkError);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Goes to the first problem in page order, whichever kind of control it is
  const onInvalid = (invalidFields: FieldErrors) => {
    const first = form.questions.find((q) => invalidFields[q.id]);
    if (!first) return;
    document
      .getElementById(`question-${first.id}`)
      ?.querySelector<HTMLElement>(
        'input:not([type=file]):not([type=hidden]), textarea, button, [data-focus-target]',
      )
      ?.focus();
  };

  const handleReset = () => {
    reset();
    setIsSubmitted(false);
  };

  // Submitted files belong to the response, but these were never submitted
  const handleClearForm = () => {
    for (const q of form.questions) {
      if (q.type !== 'FILE_UPLOAD') continue;
      const file = getValues(q.id) as FileUploadValue | null;
      if (file) deleteUploadedFile(file);
    }
    reset();
    setIsClearDialogOpen(false);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        {isPreview && (
          <PreviewBanner
            formId={form.id}
            isPublished={form.isPublished}
            notice={dict.publicForm.previewSuccessNotice}
          />
        )}
        <div className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-xl">
            <CheckCircle2
              aria-hidden="true"
              className="size-6 text-emerald-700 dark:text-emerald-400"
            />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-balance text-foreground sm:text-3xl">
              {form.title}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {dict.publicForm.successTitle}
            </p>

            <Button
              variant="outline"
              onClick={handleReset}
              className="mt-8 h-11 cursor-pointer gap-2 sm:h-9"
            >
              <RotateCcw aria-hidden="true" className="size-3.5" />
              {dict.publicForm.submitAnother}
            </Button>

            <footer className="mt-12 border-t pt-6 text-xs text-muted-foreground">
              <p>{dict.publicForm.footer}</p>
            </footer>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
      className="min-h-screen bg-background"
    >
      {/* Sticky Top Preview Banner */}
      {isPreview && (
        <PreviewBanner
          formId={form.id}
          isPublished={form.isPublished}
          notice={dict.publicForm.previewDesc}
        />
      )}

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        {/* Top Header Floating Controls */}
        <div className="mx-auto max-w-xl flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FormMakerLogo className="size-4" />
            <span>{dict.publicForm.brand}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          noValidate
          className="mx-auto max-w-xl"
        >
          {/* Honeypot: invisible to people, tempting to bots */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] size-px opacity-0"
          />

          {/* Form Header Banner & Title */}
          <div className="pb-8">
            {form.headerImage && (
              <div className="mb-8 overflow-hidden rounded-md border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.headerImage}
                  alt={form.title}
                  width={1200}
                  height={300}
                  className="w-full aspect-[4/1] object-cover block"
                />
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-balance break-words text-foreground">
              {form.title}
            </h1>
            {form.description && (
              <p className="mt-2 text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                {form.description}
              </p>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              {dict.publicForm.requiredIndicator}
            </p>
          </div>

          {/* Dynamic Questions */}
          {form.questions.map((q, index) => {
            const fieldError = errors[q.id]?.message as string | undefined;
            const labelId = `question-${q.id}-label`;
            const inputId = `question-${q.id}-input`;
            const descriptionId = `question-${q.id}-description`;
            const errorId = `question-${q.id}-error`;
            const describedBy =
              [
                q.config?.description ? descriptionId : null,
                fieldError ? errorId : null,
              ]
                .filter(Boolean)
                .join(' ') || undefined;
            const isText = q.type === 'SHORT_TEXT' || q.type === 'LONG_TEXT';
            const LabelTag = isText ? 'label' : 'span';
            const fieldAria = {
              'aria-describedby': describedBy,
              'aria-invalid': Boolean(fieldError),
              'aria-required': q.required,
            };

            return (
              <div
                key={q.id}
                id={`question-${q.id}`}
                className="grid grid-cols-[2rem_minmax(0,1fr)] border-t py-6 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:py-8"
              >
                {/* Decorative: screen readers already announce the question order */}
                <span
                  aria-hidden="true"
                  className={`pt-1 font-mono text-xs tabular-nums ${
                    fieldError ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>

                {/* Question Label & Description */}
                <div className="flex items-start gap-2.5 mb-3">
                  {q.config?.icon && (
                    <div className="text-muted-foreground shrink-0 mt-1">
                      <QuestionIcon name={q.config.icon} className="size-4" />
                    </div>
                  )}
                  <div className="space-y-1 flex-1 min-w-0">
                    <LabelTag
                      id={labelId}
                      htmlFor={isText ? inputId : undefined}
                      className="block text-base font-medium break-words text-foreground"
                    >
                      <span>{q.label}</span>
                      {q.required && (
                        <span
                          aria-hidden="true"
                          className="ml-1 text-destructive font-bold"
                        >
                          *
                        </span>
                      )}
                    </LabelTag>
                    {q.config?.description && (
                      <p
                        id={descriptionId}
                        className="text-sm text-muted-foreground"
                      >
                        {q.config.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Question Controls based on type */}
                <div className="col-start-2">
                  {/* 1. Short Text */}
                  {q.type === 'SHORT_TEXT' && (
                    <Input
                      id={inputId}
                      {...fieldAria}
                      placeholder={
                        q.config?.placeholder ||
                        'Yanıtınız…'
                      }
                      {...register(q.id)}
                      className={fieldSizeClass}
                    />
                  )}

                  {/* 2. Long Text */}
                  {q.type === 'LONG_TEXT' && (
                    <Textarea
                      id={inputId}
                      {...fieldAria}
                      rows={4}
                      placeholder={
                        q.config?.placeholder ||
                        'Yanıtınız…'
                      }
                      {...register(q.id)}
                      className="text-base md:text-sm resize-y"
                    />
                  )}

                  {/* 3. Single Choice (Radio) */}
                  {q.type === 'SINGLE_CHOICE' && (
                    <div
                      role="radiogroup"
                      aria-labelledby={labelId}
                      {...fieldAria}
                      className="space-y-1.5"
                    >
                      {q.options.map((opt) => (
                        <label key={opt.id} className={optionRowClass}>
                          <input
                            type="radio"
                            value={opt.id}
                            {...register(q.id)}
                            className="size-4 shrink-0 accent-primary cursor-pointer"
                          />
                          <span className="min-w-0 break-words">
                            {opt.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* 4. Multiple Choice (Checkboxes) */}
                  {q.type === 'MULTIPLE_CHOICE' && (
                    <Controller
                      control={control}
                      name={q.id}
                      render={({ field }) => {
                        const currentValues: string[] = Array.isArray(
                          field.value,
                        )
                          ? field.value
                          : [];

                        const toggleOption = (optId: string) => {
                          const updated = currentValues.includes(optId)
                            ? currentValues.filter((v) => v !== optId)
                            : [...currentValues, optId];
                          field.onChange(updated);
                        };

                        return (
                          <div
                            role="group"
                            aria-labelledby={labelId}
                            aria-describedby={describedBy}
                            className="space-y-1.5"
                          >
                            {q.options.map((opt) => {
                              const isChecked = currentValues.includes(opt.id);
                              return (
                                <label key={opt.id} className={optionRowClass}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleOption(opt.id)}
                                    className="size-4 shrink-0 accent-primary rounded cursor-pointer"
                                  />
                                  <span className="min-w-0 break-words">
                                    {opt.label}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        );
                      }}
                    />
                  )}

                  {/* 5. Dropdown Select */}
                  {q.type === 'DROPDOWN' && (
                    <Controller
                      control={control}
                      name={q.id}
                      render={({ field }) => (
                        <Select
                          value={
                            typeof field.value === 'string' ? field.value : ''
                          }
                          onValueChange={(val) => {
                            if (val) field.onChange(val);
                          }}
                        >
                          <SelectTrigger
                            aria-labelledby={labelId}
                            {...fieldAria}
                            className="w-full text-base data-[size=default]:h-11 sm:data-[size=default]:h-10 md:text-sm"
                          >
                            <SelectValue
                              placeholder={
                                q.config?.placeholder ||
                                dict.publicForm.selectOptionPlaceholder
                              }
                            >
                              {(val: string | null) => {
                                if (!val) {
                                  return (
                                    q.config?.placeholder ||
                                    dict.publicForm.selectOptionPlaceholder
                                  );
                                }
                                const matched = q.options.find(
                                  (o) => o.id === val || o.label === val,
                                );
                                return matched ? matched.label : val;
                              }}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {q.options.map((opt) => (
                              <SelectItem key={opt.id} value={opt.id}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  )}

                  {/* 6. File Upload with native Drag and Drop */}
                  {q.type === 'FILE_UPLOAD' && (
                    <Controller
                      control={control}
                      name={q.id}
                      render={({ field }) => (
                        <PublicFileInput
                          formId={form.id}
                          questionId={q.id}
                          config={q.config}
                          value={field.value as FileUploadValue | null}
                          onChange={(val) => field.onChange(val)}
                          onUploadStateChange={handleUploadStateChange}
                          labelledBy={labelId}
                          describedBy={describedBy}
                        />
                      )}
                    />
                  )}
                </div>

                {/* Validation error display */}
                {fieldError && (
                  <p
                    id={errorId}
                    className="col-start-2 mt-2 text-sm text-destructive"
                  >
                    {fieldError}
                  </p>
                )}
              </div>
            );
          })}

          {/* Form Actions */}
          <div className="flex flex-col gap-1 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="submit"
              // Before hydration the browser would submit natively, putting the answers in the URL
              disabled={!isHydrated || isSubmitting || uploadingCount > 0}
              className="h-11 cursor-pointer gap-2 font-medium px-6 sm:h-9"
            >
              {(isSubmitting || uploadingCount > 0) && (
                <Loader2 className="size-4 animate-spin" />
              )}
              <span>
                {uploadingCount > 0
                  ? dict.publicForm.uploading
                  : isSubmitting
                    ? dict.publicForm.submitting
                    : dict.publicForm.submit}
              </span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              disabled={uploadingCount > 0}
              onClick={() => setIsClearDialogOpen(true)}
              className="h-11 cursor-pointer text-muted-foreground hover:text-foreground sm:h-9"
            >
              Formu temizle
            </Button>
          </div>

          <footer className="text-xs text-muted-foreground pt-8 pb-4">
            <p>
              Formlar aracılığıyla asla şifre veya hassas finansal bilgi göndermeyin.
            </p>
          </footer>
        </form>
      </div>

      <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Formu temizle</DialogTitle>
            <DialogDescription>
              Tüm yanıtlar temizlensin mi? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsClearDialogOpen(false)}
            >
              İptal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleClearForm}
            >
              Temizle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
