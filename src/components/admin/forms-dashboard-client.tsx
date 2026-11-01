'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { LogoutButton } from '@/components/admin/logout-button';
import { CreateFormButton } from '@/components/admin/create-form-button';
import { FormCardActions } from '@/components/admin/form-card-actions';
import { deleteForm } from '@/actions/form-actions';
import { dict } from '@/lib/dictionary';
import { normalizeSearchText } from '@/lib/search';
import { cn } from '@/lib/utils';
import { FormMakerLogo } from '../formmaker-logo';

export interface DashboardFormItem {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  isPublished: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count?: {
    submissions?: number;
    questions?: number;
  };
}

interface FormsDashboardClientProps {
  initialForms: DashboardFormItem[];
}

type StatusFilter = 'all' | 'live' | 'draft';

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: dict.dashboard.filterAll },
  { value: 'live', label: dict.dashboard.statusLive },
  { value: 'draft', label: dict.dashboard.statusDraft },
];

const numberFormat = new Intl.NumberFormat('tr-TR');
// A fixed time zone, so the server and the browser render the same date
const dateFormat = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Europe/Istanbul',
});

function StatusLabel({ isPublished }: { isPublished: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span
        aria-hidden="true"
        className={cn(
          'size-2 rounded-full border-[1.5px]',
          isPublished
            ? 'border-emerald-600 bg-emerald-600 dark:border-emerald-400 dark:bg-emerald-400'
            : 'border-muted-foreground',
        )}
      />
      {isPublished ? dict.dashboard.statusLive : dict.dashboard.statusDraft}
    </span>
  );
}

export function FormsDashboardClient({
  initialForms,
}: FormsDashboardClientProps) {
  const router = useRouter();
  const [deletedIds, setDeletedIds] = React.useState<string[]>([]);
  const [formToDelete, setFormToDelete] = React.useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<StatusFilter>('all');

  const forms = React.useMemo(
    () => initialForms.filter((f) => !deletedIds.includes(f.id)),
    [initialForms, deletedIds],
  );

  const visibleForms = React.useMemo(() => {
    const query = normalizeSearchText(search);
    return forms.filter((f) => {
      if (status === 'live' && !f.isPublished) return false;
      if (status === 'draft' && f.isPublished) return false;
      if (!query) return true;
      return normalizeSearchText(
        `${f.title} ${f.description ?? ''} ${f.slug}`,
      ).includes(query);
    });
  }, [forms, search, status]);

  const totalSubmissions = forms.reduce(
    (acc, f) => acc + (f._count?.submissions || 0),
    0,
  );
  const publishedCount = forms.filter((f) => f.isPublished).length;

  const confirmDeleteForm = async () => {
    if (!formToDelete) return;
    const idToDelete = formToDelete.id;
    setFormToDelete(null);

    // 1. Optimistic removal: row disappears instantly!
    setDeletedIds((prev) => [...prev, idToDelete]);

    // 2. Server action
    setIsDeleting(true);
    try {
      const res = await deleteForm(idToDelete);
      if (res.success) {
        router.refresh();
      } else {
        setDeletedIds((prev) => prev.filter((id) => id !== idToDelete));
        toast.error(res.error || dict.dashboard.formDeleteFailed);
      }
    } catch {
      setDeletedIds((prev) => prev.filter((id) => id !== idToDelete));
      toast.error(dict.dashboard.formDeleteFailed);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Admin Top Navigation */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-2.5 text-sm">
          <Link
            href="/"
            aria-label={dict.nav.home}
            className="flex items-center gap-2 rounded-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <FormMakerLogo className="size-5" />
            <span translate="no">FormMaker</span>
          </Link>
          <span aria-hidden="true" className="text-muted-foreground">
            /
          </span>
          <span className="font-medium text-foreground">
            {dict.common.forms}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LogoutButton showText />
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {dict.common.forms}
            </h1>
            <p className="mt-1.5 text-sm tabular-nums text-muted-foreground">
              {dict.dashboard.summary
                .replace('{forms}', numberFormat.format(forms.length))
                .replace('{live}', numberFormat.format(publishedCount))
                .replace('{responses}', numberFormat.format(totalSubmissions))}
            </p>
          </div>
          <CreateFormButton />
        </div>

        {forms.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-md border border-dashed border-muted-foreground/50 p-12 text-center">
            <FileText aria-hidden="true" className="size-5 text-muted-foreground" />
            <h2 className="mt-3 text-base font-medium text-foreground">
              {dict.dashboard.noFormsTitle}
            </h2>
            <p className="mt-1 mb-4 max-w-sm text-sm text-muted-foreground">
              {dict.dashboard.noFormsDesc}
            </p>
            <CreateFormButton />
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <div
                role="group"
                aria-label={dict.dashboard.filterLabel}
                className="flex gap-1"
              >
                {statusFilters.map((filter) => (
                  <Button
                    key={filter.value}
                    type="button"
                    size="sm"
                    variant={status === filter.value ? 'secondary' : 'ghost'}
                    aria-pressed={status === filter.value}
                    onClick={() => setStatus(filter.value)}
                    className={cn(
                      'cursor-pointer',
                      status !== filter.value && 'text-muted-foreground',
                    )}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
              <div className="relative w-full sm:w-64">
                <Search
                  aria-hidden="true"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none"
                />
                <Input
                  type="search"
                  name="form-search"
                  autoComplete="off"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={dict.dashboard.search}
                  aria-label={dict.dashboard.search}
                  className="pl-8 text-base md:text-sm"
                />
              </div>
            </div>

            {/* Forms Table */}
            {visibleForms.length === 0 ? (
              <p className="mt-4 rounded-md border py-12 text-center text-sm text-muted-foreground">
                {dict.dashboard.noSearchResults}
              </p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-md border">
                <table className="w-full table-fixed border-collapse text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th scope="col" className="px-4 py-2.5 font-normal">
                        {dict.dashboard.columnForm}
                      </th>
                      <th scope="col" className="hidden w-28 px-4 py-2.5 font-normal sm:table-cell">
                        {dict.dashboard.columnStatus}
                      </th>
                      <th scope="col" className="hidden w-20 px-4 py-2.5 text-right font-normal sm:table-cell">
                        {dict.dashboard.columnQuestions}
                      </th>
                      <th scope="col" className="hidden w-20 px-4 py-2.5 text-right font-normal sm:table-cell">
                        {dict.dashboard.columnResponses}
                      </th>
                      <th scope="col" className="hidden w-36 px-4 py-2.5 font-normal md:table-cell">
                        {dict.dashboard.columnUpdated}
                      </th>
                      <th scope="col" className="w-30 px-2 py-2.5 sm:w-32">
                        <span className="sr-only">
                          {dict.dashboard.columnActions}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleForms.map((form) => {
                      const subCount = form._count?.submissions || 0;
                      const qCount = form._count?.questions || 0;
                      const title = form.title || 'Başlıksız Form';

                      return (
                        <tr
                          key={form.id}
                          className="relative border-b transition-colors last:border-b-0 hover:bg-muted/60"
                        >
                          <td className="px-4 py-3">
                            {/* The link's overlay makes the whole row clickable */}
                            <Link
                              href={`/admin/forms/${form.id}/edit`}
                              className="block truncate font-medium text-foreground outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
                            >
                              {title}
                            </Link>
                            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                              /forms/{form.slug}
                            </p>
                            <div className="mt-1.5 flex items-center gap-2 text-xs tabular-nums text-muted-foreground sm:hidden">
                              <StatusLabel isPublished={form.isPublished} />
                              <span aria-hidden="true">·</span>
                              <span>{numberFormat.format(subCount)} yanıt</span>
                            </div>
                          </td>
                          <td className="hidden px-4 py-3 sm:table-cell">
                            <StatusLabel isPublished={form.isPublished} />
                          </td>
                          <td className="hidden px-4 py-3 text-right font-mono tabular-nums text-muted-foreground sm:table-cell">
                            {numberFormat.format(qCount)}
                          </td>
                          <td className="hidden px-4 py-3 text-right font-mono tabular-nums text-foreground sm:table-cell">
                            {numberFormat.format(subCount)}
                          </td>
                          <td className="hidden px-4 py-3 whitespace-nowrap text-muted-foreground md:table-cell">
                            {dateFormat.format(new Date(form.updatedAt))}
                          </td>
                          <td className="px-2 py-3">
                            <FormCardActions
                              slug={form.slug}
                              isPublished={form.isPublished}
                              onDeleteRequest={() =>
                                setFormToDelete({ id: form.id, title })
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {/* Confirmation Dialog for Form Deletion */}
      <Dialog
        open={Boolean(formToDelete)}
        onOpenChange={(open) => !open && setFormToDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dict.dashboard.deleteFormTitle}</DialogTitle>
            <DialogDescription>
              {`“${formToDelete?.title}” formunu ve bu forma ait tüm soru ve yanıtları kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormToDelete(null)}
              disabled={isDeleting}
            >
              İptal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteForm}
              disabled={isDeleting}
              className="gap-1.5"
            >
              {isDeleting && <Loader2 className="size-3.5 animate-spin" />}
              <span>Formu Sil</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
