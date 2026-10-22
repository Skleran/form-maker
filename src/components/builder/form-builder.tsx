'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  FormProvider,
  useForm,
  type UseFormGetValues,
  type UseFormWatch,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import {
  formBuilderSchema,
  type FormBuilderValues,
} from '@/lib/validations/form';
import { saveForm } from '@/actions/form-actions';
import { useBuilderStore } from '@/stores/use-builder-store';
import type { QuestionType, ChoiceOption, QuestionConfig } from '@/types/form';
import { BuilderHeader } from './builder-header';
import { BuilderCanvas } from './builder-canvas';
import { BuilderInspector } from './builder-inspector';
import { BuilderSettings } from './builder-settings';
import { ResponsesView } from '@/components/responses/responses-view';
import { useLanguage } from '@/lib/i18n/language-context';

interface InitialFormData {
  id: string;
  title: string;
  description: string | null;
  headerImage?: string | null;
  headerImageRaw?: string | null;
  headerImageCrop?: unknown;
  slug: string;
  isPublished: boolean;
  questions: Array<{
    id: string;
    formId?: string;
    orderIndex: number;
    type: string;
    label: string;
    required: boolean;
    options?: unknown;
    config?: unknown;
  }>;
  _count?: {
    submissions: number;
  };
}

interface FormBuilderProps {
  initialForm: InitialFormData;
}

function cloneFormSnapshot(values: FormBuilderValues): FormBuilderValues {
  try {
    return structuredClone(values);
  } catch {
    return JSON.parse(JSON.stringify(values)) as FormBuilderValues;
  }
}

function isFormValuesEqual(
  a: FormBuilderValues | null | undefined,
  b: FormBuilderValues | null | undefined,
): boolean {
  if (!a || !b) return a === b;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

const FormHistoryObserver = React.memo(function FormHistoryObserver({
  watch,
  getValues,
  isApplyingHistoryRef,
  isInitialMountRef,
  previousSnapshotRef,
  savedSnapshotRef,
}: {
  watch: UseFormWatch<FormBuilderValues>;
  getValues: UseFormGetValues<FormBuilderValues>;
  isApplyingHistoryRef: React.MutableRefObject<boolean>;
  isInitialMountRef: React.MutableRefObject<boolean>;
  previousSnapshotRef: React.MutableRefObject<FormBuilderValues>;
  savedSnapshotRef: React.MutableRefObject<FormBuilderValues>;
}) {
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const { language } = useLanguage();

  const isDirty = useBuilderStore((s) => s.isDirty);

  // Subscribe to RHF changes via callback without triggering React re-renders on every keystroke
  React.useEffect(() => {
    const subscription = watch(() => {
      if (isInitialMountRef.current || isApplyingHistoryRef.current) return;

      // Mark dirty immediately on first edit without full-form JSON.stringify per keystroke
      if (!useBuilderStore.getState().isDirty) {
        useBuilderStore.getState().setIsDirty(true);
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        if (isInitialMountRef.current || isApplyingHistoryRef.current) return;
        const currentValues = getValues();

        // Reconcile dirty state with saved snapshot once typing settles
        if (savedSnapshotRef.current) {
          const dirty = !isFormValuesEqual(
            currentValues,
            savedSnapshotRef.current,
          );
          useBuilderStore.getState().setIsDirty(dirty);
          if (!dirty) {
            previousSnapshotRef.current = cloneFormSnapshot(currentValues);
            return;
          }
        }

        if (
          previousSnapshotRef.current &&
          !isFormValuesEqual(previousSnapshotRef.current, currentValues)
        ) {
          useBuilderStore
            .getState()
            .pushHistory(cloneFormSnapshot(previousSnapshotRef.current));
          previousSnapshotRef.current = cloneFormSnapshot(currentValues);
        }
      }, 600);
    });

    return () => {
      subscription.unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    watch,
    getValues,
    isInitialMountRef,
    isApplyingHistoryRef,
    previousSnapshotRef,
    savedSnapshotRef,
  ]);

  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useBuilderStore.getState().isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Intercept browser back/forward buttons (popstate) when there are unsaved changes
  React.useEffect(() => {
    if (!isDirty) return;

    // Push guard entry to history stack so browser back/forward buttons trigger popstate on the current page
    const guardState = { formMakerGuard: true };
    window.history.pushState(guardState, '', window.location.href);

    const handlePopState = () => {
      if (useBuilderStore.getState().isDirty) {
        const message =
          language === 'tr'
            ? 'Kaydedilmemiş değişiklikleriniz var. Sayfadan ayrılmak istediğinizden emin misiniz?\n\nYaptığınız değişiklikler kaybolacaktır.'
            : 'You have unsaved changes. Are you sure you want to leave?\n\nYour changes will be lost.';

        const confirmLeave = window.confirm(message);

        if (!confirmLeave) {
          // User chose to stay: re-push guard state to remain on current edit page
          window.history.pushState(guardState, '', window.location.href);
        } else {
          // User chose to leave: mark clean and proceed back
          useBuilderStore.getState().setIsDirty(false);
          window.history.back();
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isDirty, language]);

  return null;
});

function BuilderMainContainer({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 overflow-hidden relative">{children}</main>
  );
}

export function FormBuilder({ initialForm }: FormBuilderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'questions';

  const routeStateRef = React.useRef({ activeTab, pathname });
  React.useEffect(() => {
    routeStateRef.current = { activeTab, pathname };
  }, [activeTab, pathname]);

  // Reset workspace state on mount and unmount
  React.useEffect(() => {
    useBuilderStore.getState().resetWorkspace();
    return () => {
      useBuilderStore.getState().resetWorkspace();
    };
  }, []);

  // Memoized initial form values
  const initialValues = React.useMemo<FormBuilderValues>(
    () => ({
      title: initialForm.title || 'Başlıksız Form',
      description: initialForm.description || '',
      headerImage: initialForm.headerImage || null,
      headerImageRaw: initialForm.headerImageRaw || null,
      headerImageCrop:
        (initialForm.headerImageCrop as FormBuilderValues['headerImageCrop']) ||
        null,
      slug: initialForm.slug,
      isPublished: initialForm.isPublished,
      questions: initialForm.questions.map((q, idx) => ({
        id: q.id,
        formId: q.formId,
        orderIndex: q.orderIndex ?? idx,
        type: q.type as QuestionType,
        label: q.label,
        required: q.required,
        options: (q.options as ChoiceOption[]) || [],
        config: (q.config as QuestionConfig) || {},
      })),
    }),
    [initialForm],
  );

  // React Hook Form owns question items and form schema definition
  const methods = useForm<FormBuilderValues>({
    resolver: zodResolver(formBuilderSchema),
    defaultValues: initialValues,
  });

  // Reference to the latest saved (or initial) snapshot
  const savedSnapshotRef = React.useRef<FormBuilderValues>(
    cloneFormSnapshot(initialValues),
  );

  // History tracking refs
  const isApplyingHistoryRef = React.useRef(false);
  const isInitialMountRef = React.useRef(true);
  const previousSnapshotRef = React.useRef<FormBuilderValues>(
    cloneFormSnapshot(initialValues),
  );

  // Ensure history is clean on mount and track mount completion
  React.useEffect(() => {
    useBuilderStore.getState().clearHistory();
    const timer = setTimeout(() => {
      isInitialMountRef.current = false;
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Undo action handler
  const handleUndo = React.useCallback(() => {
    const store = useBuilderStore.getState();
    const current = cloneFormSnapshot(methods.getValues());
    const previous = store.undo(current);
    if (previous) {
      isApplyingHistoryRef.current = true;
      const clonedPrevious = cloneFormSnapshot(previous);
      methods.reset(clonedPrevious, { keepDefaultValues: true });
      previousSnapshotRef.current = cloneFormSnapshot(clonedPrevious);
      const isNowDirty = !isFormValuesEqual(
        clonedPrevious,
        savedSnapshotRef.current,
      );
      store.setIsDirty(isNowDirty);
      if (clonedPrevious.questions.length > 0) {
        const stillExists = clonedPrevious.questions.some(
          (q) => q.id === store.activeQuestionId,
        );
        if (!stillExists) {
          store.setActiveQuestionId(clonedPrevious.questions[0].id);
        }
      } else {
        store.setActiveQuestionId(null);
      }
      toast.info('Geri alma işlemi yapıldı');
      setTimeout(() => {
        isApplyingHistoryRef.current = false;
      }, 100);
    }
  }, [methods]);

  // Redo action handler
  const handleRedo = React.useCallback(() => {
    const store = useBuilderStore.getState();
    const current = cloneFormSnapshot(methods.getValues());
    const next = store.redo(current);
    if (next) {
      isApplyingHistoryRef.current = true;
      const clonedNext = cloneFormSnapshot(next);
      methods.reset(clonedNext, { keepDefaultValues: true });
      previousSnapshotRef.current = cloneFormSnapshot(clonedNext);
      const isNowDirty = !isFormValuesEqual(
        clonedNext,
        savedSnapshotRef.current,
      );
      store.setIsDirty(isNowDirty);
      if (clonedNext.questions.length > 0) {
        const stillExists = clonedNext.questions.some(
          (q) => q.id === store.activeQuestionId,
        );
        if (!stillExists) {
          store.setActiveQuestionId(clonedNext.questions[0].id);
        }
      } else {
        store.setActiveQuestionId(null);
      }
      toast.info('Yineleme işlemi yapıldı');
      setTimeout(() => {
        isApplyingHistoryRef.current = false;
      }, 100);
    }
  }, [methods]);

  // Save handler
  const handleSave = React.useCallback(async () => {
    const store = useBuilderStore.getState();
    if (store.isSaving) return;

    const isValid = await methods.trigger();
    if (!isValid) {
      const hasSlugFormatError = Boolean(methods.getFieldState('slug').error);
      const { activeTab: currentTab, pathname: currentPathname } =
        routeStateRef.current;
      if (hasSlugFormatError && currentTab !== 'settings') {
        router.replace(`${currentPathname}?tab=settings`, { scroll: false });
        return;
      }
      if (!hasSlugFormatError) {
        toast.error('Lütfen kaydetmeden önce formdaki hataları giderin.');
      }
      return;
    }

    store.setIsSaving(true);
    try {
      const values = cloneFormSnapshot(methods.getValues());
      const sessionFiles = store.sessionUploadedFiles;
      const res = await saveForm(initialForm.id, values, sessionFiles);

      if (res.success) {
        const nextStore = useBuilderStore.getState();
        nextStore.setSlugConflict(null);
        nextStore.setLastSavedAt(new Date());
        methods.reset(values);
        nextStore.setIsDirty(false);
        savedSnapshotRef.current = cloneFormSnapshot(values);
        previousSnapshotRef.current = cloneFormSnapshot(values);
        nextStore.clearHistory();
        nextStore.clearSessionUploadedFiles();
        toast.success('Form başarıyla kaydedildi!');
      } else if (res.slugConflict) {
        const nextStore = useBuilderStore.getState();
        nextStore.setSlugConflict(res.slugConflict);
        methods.setError('slug', {
          type: 'conflict',
          message: res.error,
        });
        const { activeTab: currentTab, pathname: currentPathname } =
          routeStateRef.current;
        if (currentTab !== 'settings') {
          router.replace(`${currentPathname}?tab=settings`, { scroll: false });
        }
      } else {
        toast.error(res.error || 'Form kaydedilemedi.');
      }
    } catch {
      toast.error('Kaydetme sırasında beklenmeyen bir hata oluştu.');
    } finally {
      useBuilderStore.getState().setIsSaving(false);
    }
  }, [methods, initialForm.id, router]);

  // Global keyboard shortcuts: Ctrl/Cmd + S (Save), Ctrl/Cmd + Z (Undo), Ctrl/Cmd + Shift + Z / Ctrl/Cmd + Y (Redo)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleUndo, handleRedo]);

  // Discard handler: reverts all changes back to initial or last saved state
  const handleDiscard = React.useCallback(() => {
    const store = useBuilderStore.getState();
    const target = cloneFormSnapshot(savedSnapshotRef.current || initialValues);

    // Clean up any session uploaded files that were abandoned upon discard
    const targetFiles = new Set(
      [target.headerImage, target.headerImageRaw].filter(Boolean) as string[],
    );
    const abandonedFiles = store.sessionUploadedFiles.filter(
      (f) => !targetFiles.has(f),
    );
    if (abandonedFiles.length > 0) {
      fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: abandonedFiles }),
      }).catch(console.error);
    }

    isApplyingHistoryRef.current = true;
    methods.reset(target);
    methods.clearErrors();
    previousSnapshotRef.current = cloneFormSnapshot(target);
    store.setSlugConflict(null);
    store.clearHistory();
    store.clearSessionUploadedFiles();
    store.setIsDirty(false);
    if (target.questions.length > 0) {
      store.setActiveQuestionId(target.questions[0].id);
    } else {
      store.setActiveQuestionId(null);
    }
    toast.info('Kaydedilmemiş değişiklikler geri alındı');
    setTimeout(() => {
      isApplyingHistoryRef.current = false;
    }, 100);
  }, [initialValues, methods]);

  // Question manipulation helpers
  const handleAddQuestion = React.useCallback(
    (type: QuestionType = 'SHORT_TEXT') => {
      const store = useBuilderStore.getState();
      const currentSnapshot = cloneFormSnapshot(methods.getValues());
      const currentQuestions = currentSnapshot.questions || [];
      store.pushHistory(currentSnapshot);

      const newId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const newQuestion = {
        id: newId,
        orderIndex: currentQuestions.length,
        type,
        label: 'Başlıksız Soru',
        required: false,
        options: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN'].includes(type)
          ? [{ id: `opt_${Date.now()}_1`, label: 'Seçenek 1' }]
          : [],
        config: {
          placeholder:
            type === 'SHORT_TEXT' ? 'Yanıtınızı girin...' : undefined,
          maxFileSizeMb: type === 'FILE_UPLOAD' ? 10 : undefined,
        },
      };

      const updatedQuestions = [...currentQuestions, newQuestion];
      methods.setValue('questions', updatedQuestions, {
        shouldDirty: true,
      });
      previousSnapshotRef.current = cloneFormSnapshot(methods.getValues());
      store.setIsDirty(true);
      store.setActiveQuestionId(newId);
    },
    [methods],
  );

  const handleDuplicateQuestion = React.useCallback(
    (index: number) => {
      const store = useBuilderStore.getState();
      const currentSnapshot = cloneFormSnapshot(methods.getValues());
      const currentQuestions = currentSnapshot.questions || [];
      const target = currentQuestions[index];
      if (!target) return;

      store.pushHistory(currentSnapshot);

      const newId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const duplicated = {
        ...target,
        id: newId,
        label: `${target.label} (Kopya)`,
        options:
          target.options?.map((opt, i) => ({
            id: `opt_${Date.now()}_${i + 1}`,
            label: opt.label,
          })) || [],
      };

      const updated = [
        ...currentQuestions.slice(0, index + 1),
        duplicated,
        ...currentQuestions.slice(index + 1),
      ];

      methods.setValue('questions', updated, { shouldDirty: true });
      previousSnapshotRef.current = cloneFormSnapshot(methods.getValues());
      store.setIsDirty(true);
      store.setActiveQuestionId(newId);
      toast.info('Soru çoğaltıldı');
    },
    [methods],
  );

  const submissionCount = initialForm._count?.submissions ?? 0;

  const handleDeleteQuestion = React.useCallback(
    (index: number) => {
      const store = useBuilderStore.getState();
      const currentSnapshot = cloneFormSnapshot(methods.getValues());
      const currentQuestions = currentSnapshot.questions || [];
      const target = currentQuestions[index];
      if (!target) return;

      store.pushHistory(currentSnapshot);

      const updated = currentQuestions.filter((_, i) => i !== index);

      methods.setValue('questions', updated, { shouldDirty: true });
      previousSnapshotRef.current = cloneFormSnapshot(methods.getValues());
      store.setIsDirty(true);
      if (store.activeQuestionId === target.id) {
        store.deselectQuestion();
      }

      if (submissionCount > 0) {
        toast.info(
          'Soru kaldırıldı. Bu soruya verilmiş eski yanıtlar yanıtlarda arşiv olarak korunacaktır.',
        );
      } else {
        toast.info('Soru kaldırıldı');
      }
    },
    [methods, submissionCount],
  );

  return (
    <FormProvider {...methods}>
      <FormHistoryObserver
        watch={methods.watch}
        getValues={methods.getValues}
        isApplyingHistoryRef={isApplyingHistoryRef}
        isInitialMountRef={isInitialMountRef}
        previousSnapshotRef={previousSnapshotRef}
        savedSnapshotRef={savedSnapshotRef}
      />
      <div className="flex h-dvh flex-col bg-background overflow-hidden">
        {/* Top Header */}
        <BuilderHeader
          formId={initialForm.id}
          submissionCount={initialForm._count?.submissions || 0}
          onSave={handleSave}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onDiscard={handleDiscard}
        />

        {/* Builder Main Work Area */}
        <BuilderMainContainer>
          {activeTab === 'questions' && (
            <>
              <BuilderCanvas
                onAddQuestion={handleAddQuestion}
                onDuplicateQuestion={handleDuplicateQuestion}
                onDeleteQuestion={handleDeleteQuestion}
              />
              <BuilderInspector
                onDuplicateQuestion={handleDuplicateQuestion}
                onDeleteQuestion={handleDeleteQuestion}
              />
            </>
          )}

          {activeTab === 'responses' && (
            <ResponsesView formId={initialForm.id} />
          )}

          {activeTab === 'settings' && (
            <BuilderSettings formId={initialForm.id} />
          )}
        </BuilderMainContainer>
      </div>
    </FormProvider>
  );
}
