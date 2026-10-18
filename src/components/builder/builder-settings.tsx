'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Globe,
  Link2,
  ShieldAlert,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { checkSlugAvailability, deleteForm } from '@/actions/form-actions';
import { useBuilderStore } from '@/stores/use-builder-store';
import type { FormBuilderValues } from '@/lib/validations/form';
import { useLanguage } from '@/lib/i18n/language-context';
import { cn } from '@/lib/utils';

interface BuilderSettingsProps {
  formId: string;
}

export function BuilderSettings({ formId }: BuilderSettingsProps) {
  const router = useRouter();
  const { dict } = useLanguage();
  const {
    register,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useFormContext<FormBuilderValues>();
  const isPublished = watch('isPublished');
  const currentSlug = watch('slug');

  const slugConflict = useBuilderStore((s) => s.slugConflict);
  const setSlugConflict = useBuilderStore((s) => s.setSlugConflict);

  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const rawSlug = currentSlug ?? '';
  const liveFormatError =
    rawSlug.length === 0
      ? 'Form bağlantı adresi (slug) zorunludur'
      : !/^[a-z0-9-]+$/.test(rawSlug)
        ? 'Bağlantı adresi yalnızca küçük harf, rakam ve tire (-) içerebilir'
        : null;

  // Live check for slug format & collisions while editing in "Paylaşım ve URL"
  React.useEffect(() => {
    if (slugConflict && slugConflict.slug !== rawSlug) {
      setSlugConflict(null);
    }

    if (liveFormatError) {
      if (errors.slug?.message !== liveFormatError) {
        setError('slug', {
          type: 'format',
          message: liveFormatError,
        });
      }
      return;
    }

    // Format is valid: clear any lingering format/Zod validation error immediately
    if (errors.slug && errors.slug.type !== 'conflict') {
      clearErrors('slug');
    } else if (
      errors.slug?.type === 'conflict' &&
      slugConflict?.slug !== rawSlug
    ) {
      clearErrors('slug');
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const res = await checkSlugAvailability(formId, rawSlug);
      if (cancelled) return;
      if (!res.available && res.conflict) {
        setSlugConflict(res.conflict);
        setError('slug', {
          type: 'conflict',
          message: `"${res.conflict.slug}" kısa bağlantısı (URL) başka bir form tarafından kullanılıyor.`,
        });
      } else {
        setSlugConflict(null);
        if (errors.slug?.type === 'conflict') {
          clearErrors('slug');
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    rawSlug,
    liveFormatError,
    formId,
    slugConflict,
    errors.slug,
    setSlugConflict,
    setError,
    clearErrors,
  ]);

  const activeConflict =
    !liveFormatError && slugConflict && slugConflict.slug === rawSlug
      ? slugConflict
      : null;
  const displaySlugError =
    liveFormatError || (!activeConflict ? errors.slug?.message : null);
  const hasSlugError = Boolean(activeConflict || displaySlugError);

  const slugRegistration = register('slug');

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const lower = input.value
      .replace(/İ/g, 'i')
      .replace(/I/g, 'i')
      .toLowerCase();
    input.value = lower;
    if (start !== null && end !== null) {
      input.setSelectionRange(start, end);
    }
    slugRegistration.onChange(e);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteForm(formId);
      if (res.success) {
        toast.success(dict.builder.settings.deleteSuccess);
        router.push('/admin/forms');
      } else {
        toast.error(res.error || dict.builder.settings.deleteFailed);
      }
    } catch {
      toast.error(dict.builder.settings.deleteFailed);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 bg-muted/15 min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto max-w-2xl space-y-6 pb-6">
        {/* General Form Settings */}
        <Card className="p-6 bg-card border shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {dict.builder.settings.generalTitle}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {dict.builder.settings.generalDesc}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {dict.builder.settings.formTitle}
              </label>
              <Input {...register('title')} className="text-sm" />
              {errors.title && (
                <p className="text-xs text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {dict.builder.settings.description}
              </label>
              <Textarea
                rows={3}
                {...register('description')}
                className="text-sm resize-none"
              />
            </div>
          </div>
        </Card>

        {/* Distribution & URL Slug */}
        <Card className="p-6 bg-card border shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-primary" />
            <h3 className="text-base font-semibold text-foreground">
              {dict.builder.settings.distributionTitle}
            </h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Link2 className="size-3.5" />
                {dict.builder.settings.customSlug}
              </label>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-xs font-mono px-2.5 py-1.5 rounded-md border transition-colors',
                    hasSlugError
                      ? 'border-destructive/60 bg-destructive/10 text-destructive'
                      : 'text-muted-foreground bg-muted',
                  )}
                >
                  /forms/
                </span>
                <Input
                  {...slugRegistration}
                  onChange={handleSlugChange}
                  aria-invalid={hasSlugError}
                  placeholder="geri-bildirim-formu"
                  className={cn(
                    'font-mono text-sm',
                    hasSlugError &&
                      'border-destructive bg-destructive/5 text-destructive focus-visible:border-destructive focus-visible:ring-destructive/20 dark:border-destructive',
                  )}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {dict.builder.settings.slugHint}
              </p>

              {activeConflict ? (
                <div className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive space-y-1.5">
                  <div className="flex items-start gap-2 font-medium">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <span>
                      <strong>&ldquo;{activeConflict.slug}&rdquo;</strong> kısa
                      bağlantısı şu anda{' '}
                      <strong>
                        &ldquo;{activeConflict.conflictingFormTitle}&rdquo;
                      </strong>{' '}
                      adlı form tarafından kullanılıyor.
                    </span>
                  </div>
                  <div className="pl-6">
                    <Link
                      href={`/admin/forms/${activeConflict.conflictingFormId}/edit?tab=settings`}
                      className="inline-flex items-center gap-1 font-semibold underline underline-offset-4 hover:opacity-80 transition-opacity"
                    >
                      <span>Bu adresi kullanan forma git</span>
                      <ArrowUpRight className="size-3.5 shrink-0" />
                    </Link>
                  </div>
                </div>
              ) : (
                displaySlugError && (
                  <p className="text-xs text-destructive font-medium flex items-center gap-1.5 pt-0.5">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{displaySlugError}</span>
                  </p>
                )
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3.5 bg-muted/20">
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-foreground">
                  {dict.builder.settings.publishedStatus}
                </span>
                <p className="text-xs text-muted-foreground">
                  {dict.builder.settings.publishedDesc}
                </p>
              </div>
              <Switch
                checked={isPublished}
                onCheckedChange={(checked) =>
                  setValue('isPublished', checked, { shouldDirty: true })
                }
              />
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="p-6 bg-card border-destructive/30 border shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4" />
            <h3 className="text-base font-semibold">
              {dict.builder.settings.dangerZone}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {dict.builder.settings.dangerDesc}
          </p>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger
              render={
                <Button
                  variant="destructive"
                  size="sm"
                  className="cursor-pointer gap-2"
                >
                  <Trash2 className="size-3.5" />
                  {dict.builder.settings.deleteFormBtn}
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <div className="flex items-center gap-2 text-destructive">
                  <ShieldAlert className="size-5" />
                  <DialogTitle>
                    {dict.builder.settings.deleteModalTitle}
                  </DialogTitle>
                </div>
                <DialogDescription>
                  {dict.builder.settings.deleteModalDesc}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={isDeleting}
                  className="cursor-pointer"
                >
                  {dict.builder.settings.cancel}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="cursor-pointer"
                >
                  {isDeleting
                    ? dict.builder.settings.deleting
                    : dict.builder.settings.permanentlyDelete}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Card>
      </div>
    </div>
  );
}
