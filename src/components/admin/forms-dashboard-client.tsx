'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  ArrowLeft,
  Layers,
  MessageSquare,
  Loader2,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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

  const forms = React.useMemo(
    () => initialForms.filter((f) => !deletedIds.includes(f.id)),
    [initialForms, deletedIds],
  );

  const visibleForms = React.useMemo(() => {
    const query = normalizeSearchText(search);
    if (!query) return forms;
    return forms.filter((f) =>
      normalizeSearchText(`${f.title} ${f.description ?? ''}`).includes(query),
    );
  }, [forms, search]);

  const totalSubmissions = forms.reduce(
    (acc, f) => acc + (f._count?.submissions || 0),
    0,
  );
  const publishedCount = forms.filter((f) => f.isPublished).length;

  const confirmDeleteForm = async () => {
    if (!formToDelete) return;
    const idToDelete = formToDelete.id;
    setFormToDelete(null);

    // 1. Optimistic removal: card disappears instantly!
    setDeletedIds((prev) => [...prev, idToDelete]);

    // 2. Server action
    setIsDeleting(true);
    try {
      const res = await deleteForm(idToDelete);
      if (res.success) {
        toast.success(dict.dashboard.formDeleted);
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
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>{dict.nav.home}</span>
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <FormMakerLogo className="size-4" />
            </div>
            <span className="font-semibold text-foreground text-sm">
              {dict.dashboard.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-8">
        {/* Top Summary Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {dict.dashboard.title}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Tüm formlarınızı ve yanıtlarınızı tek bir yerden yönetin.
            </p>
          </div>
          <CreateFormButton />
        </div>

        {/* Global Statistics Cards */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
          <Card className="p-4 bg-card border shadow-xs">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <FileText className="size-3.5 text-primary" />
              <span>{dict.dashboard.totalForms}</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {forms.length}
            </p>
          </Card>

          <Card className="p-4 bg-card border shadow-xs">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{dict.dashboard.publishedCount}</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {publishedCount}
            </p>
          </Card>

          <Card className="p-4 bg-card border shadow-xs col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <MessageSquare className="size-3.5 text-primary" />
              <span>{dict.dashboard.totalSubmissions}</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {totalSubmissions}
            </p>
          </Card>
        </div>

        {/* Section Heading */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h2 className="text-base font-semibold text-foreground">
              {dict.dashboard.allForms}
            </h2>
            <span className="text-xs text-muted-foreground">
              {`${forms.length} form oluşturuldu`}
            </span>
          </div>
          {forms.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={dict.dashboard.search}
                aria-label={dict.dashboard.search}
                className="pl-8 text-sm"
              />
            </div>
          )}
        </div>

        {/* Forms Grid */}
        {forms.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center bg-card border border-dashed">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <FileText className="size-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {dict.dashboard.noFormsTitle}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mb-4">
              {dict.dashboard.noFormsDesc}
            </p>
            <CreateFormButton />
          </Card>
        ) : visibleForms.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {dict.dashboard.noSearchResults}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleForms.map((form) => {
              const subCount = form._count?.submissions || 0;
              const qCount = form._count?.questions || 0;

              return (
                <Card
                  key={form.id}
                  className="group relative flex flex-col justify-between p-5 bg-card border transition-all hover:border-primary/50 hover:shadow-md hover:bg-muted/10 focus-within:border-primary/50"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge
                        variant={form.isPublished ? 'default' : 'secondary'}
                        className="text-[11px] font-medium"
                      >
                        {form.isPublished
                          ? dict.dashboard.statusLive
                          : dict.dashboard.statusDraft}
                      </Badge>

                      <FormCardActions
                        slug={form.slug}
                        isPublished={form.isPublished}
                        onDeleteRequest={() =>
                          setFormToDelete({
                            id: form.id,
                            title:
                              form.title ||
                              'Başlıksız Form',
                          })
                        }
                      />
                    </div>

                    <h3 className="font-semibold text-foreground text-base tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                      <Link
                        href={`/admin/forms/${form.id}/edit`}
                        className="outline-none hover:underline after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
                      >
                        {form.title ||
                          'Başlıksız Form'}
                      </Link>
                    </h3>

                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {form.description ||
                        'Açıklama belirtilmemiş'}
                    </p>
                  </div>

                  <div className="mt-6 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Layers className="size-3.5 text-primary" />
                      <span>
                        {qCount}{' '}
                        soru
                      </span>
                    </span>

                    <span className="flex items-center gap-1.5 font-medium">
                      <MessageSquare className="size-3.5 text-muted-foreground" />
                      <span>
                        {subCount}{' '}
                        yanıt
                      </span>
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
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
              {`"${formToDelete?.title}" formunu ve bu forma ait tüm soru ve yanıtları kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
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
