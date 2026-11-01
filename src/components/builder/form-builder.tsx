'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
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
import { BuilderHeader, setBuilderTab } from './builder-header';
import { BuilderCanvas } from './builder-canvas';
import { BuilderInspector } from './builder-inspector';
import { BuilderSettings } from './builder-settings';
import { ResponsesView } from '@/components/responses/responses-view';

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

// Showing an inspector field registers it, which adds "" to the values. That isn't an edit,
// so it must not create an undo step or mark the form as unsaved.
function dropEmptyStrings(_key: string, value: unknown) {
  return value === '' ? undefined : value;
}

function isFormValuesEqual(
  a: FormBuilderValues | null | undefined,
  b: FormBuilderValues | null | undefined,
): boolean {
  if (!a || !b) return a === b;
  try {
    return JSON.stringify(a, dropEmptyStrings) === JSON.stringify(b, dropEmptyStrings);
  } catch {
    return false;
  }
}

function isTextField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable)
  );
}

const FormHistoryObserver = React.memo(function FormHistoryObserver({
  watch,
  getValues,
  previousSnapshotRef,
  savedSnapshotRef,
}: {
  watch: UseFormWatch<FormBuilderValues>;
  getValues: UseFormGetValues<FormBuilderValues>;
  previousSnapshotRef: React.MutableRefObject<FormBuilderValues>;
  savedSnapshotRef: React.MutableRefObject<FormBuilderValues>;
}) {
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const hasHistoryGuardRef = React.useRef(false);


  const isDirty = useBuilderStore((s) => s.isDirty);

  // Subscribe to RHF changes via callback without triggering React re-renders on every keystroke
  React.useEffect(() => {
    const subscription = watch((_, { name }) => {
      // Only edits name a field. Resets (undo, redo, discard, save) set the dirty state themselves.
      if (!name) return;

      // Mark dirty immediately on first edit without full-form JSON.stringify per keystroke
      if (!useBuilderStore.getState().isDirty) {
        useBuilderStore.getState().setIsDirty(true);
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
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

  // Going back after a save uses up the guard entry even though nothing asks for confirmation
  React.useEffect(() => {
    const handlePopState = () => {
      hasHistoryGuardRef.current = false;
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Intercept browser back/forward buttons (popstate) when there are unsaved changes
  React.useEffect(() => {
    if (!isDirty) return;

    // Push guard entry to history stack so browser back/forward buttons trigger popstate on the current page.
    // An entry left by an earlier edit is still in place after a save, so only one is ever added.
    const guardState = { formMakerGuard: true };
    if (!hasHistoryGuardRef.current) {
      window.history.pushState(guardState, '', window.location.href);
      hasHistoryGuardRef.current = true;
    }

    const handlePopState = () => {
      if (useBuilderStore.getState().isDirty) {
        // Stay on the page for now: the header's dialog goes back two entries if the user leaves
        window.history.pushState(guardState, '', window.location.href);
        hasHistoryGuardRef.current = true;
        useBuilderStore.getState().setIsBackPromptOpen(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isDirty]);

  return null;
});

function BuilderMainContainer({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 overflow-hidden relative">{children}</main>
  );
}

export function FormBuilder({ initialForm }: FormBuilderProps) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'questions';

  const activeTabRef = React.useRef(activeTab);
  React.useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

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
  const previousSnapshotRef = React.useRef<FormBuilderValues>(
    cloneFormSnapshot(initialValues),
  );

  // Ensure history is clean on mount
  React.useEffect(() => {
    useBuilderStore.getState().clearHistory();
  }, []);

  // Puts the form back to a snapshot from the undo or redo stack
  const applyHistorySnapshot = React.useCallback(
    (snapshot: FormBuilderValues) => {
      const store = useBuilderStore.getState();
      const restored = cloneFormSnapshot(snapshot);
      // Memoized inputs don't register again after a reset, so they must keep their registrations:
      // otherwise they'd show the old text and what's typed next wouldn't reach the form
      methods.reset(restored, { keepDefaultValues: true, keepFieldsRef: true });
      previousSnapshotRef.current = cloneFormSnapshot(restored);
      store.setIsDirty(!isFormValuesEqual(restored, savedSnapshotRef.current));
      if (restored.questions.length > 0) {
        const stillExists = restored.questions.some(
          (q) => q.id === store.activeQuestionId,
        );
        if (!stillExists) {
          store.setActiveQuestionId(restored.questions[0].id);
        }
      } else {
        store.setActiveQuestionId(null);
      }
    },
    [methods],
  );

  const handleUndo = React.useCallback(() => {
    const current = cloneFormSnapshot(methods.getValues());
    const previous = useBuilderStore.getState().undo(current);
    if (previous) applyHistorySnapshot(previous);
  }, [methods, applyHistorySnapshot]);

  const handleRedo = React.useCallback(() => {
    const current = cloneFormSnapshot(methods.getValues());
    const next = useBuilderStore.getState().redo(current);
    if (next) applyHistorySnapshot(next);
  }, [methods, applyHistorySnapshot]);

  // Save handler
  const handleSave = React.useCallback(async (): Promise<boolean> => {
    const store = useBuilderStore.getState();
    if (store.isSaving) return false;

    const isValid = await methods.trigger();
    if (!isValid) {
      const hasSlugFormatError = Boolean(methods.getFieldState('slug').error);
      if (hasSlugFormatError && activeTabRef.current !== 'settings') {
        setBuilderTab('settings');
        return false;
      }
      if (!hasSlugFormatError) {
        // Many fields don't show their own error, so say what's wrong
        const firstIssue = formBuilderSchema.safeParse(methods.getValues()).error
          ?.issues[0]?.message;
        toast.error(
          firstIssue || 'Lütfen kaydetmeden önce formdaki hataları giderin.',
        );
      }
      return false;
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
        return true;
      } else if (res.slugConflict) {
        const nextStore = useBuilderStore.getState();
        nextStore.setSlugConflict(res.slugConflict);
        methods.setError('slug', {
          type: 'conflict',
          message: res.error,
        });
        if (activeTabRef.current !== 'settings') {
          setBuilderTab('settings');
        }
      } else {
        toast.error(res.error || 'Form kaydedilemedi.');
      }
    } catch {
      toast.error('Kaydetme sırasında beklenmeyen bir hata oluştu.');
    } finally {
      useBuilderStore.getState().setIsSaving(false);
    }
    return false;
  }, [methods, initialForm.id]);

  // Global keyboard shortcuts: Ctrl/Cmd + S (Save), Ctrl/Cmd + Z (Undo), Ctrl/Cmd + Shift + Z / Ctrl/Cmd + Y (Redo)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      } else if (isTextField(e.target)) {
        // Inside a text field, undo and redo belong to the browser
        return;
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

      // The question disappearing shows the rest, but not that its old answers are kept
      if (submissionCount > 0) {
        toast.info(
          'Soru kaldırıldı. Bu soruya verilmiş eski yanıtlar yanıtlarda arşiv olarak korunacaktır.',
        );
      }
    },
    [methods, submissionCount],
  );

  // useForm re-renders this component on every field change, and FormProvider would give every
  // useFormContext consumer a new value each time. Children subscribe to what they need instead.
  return React.useMemo(
    () => (
      <FormProvider {...methods}>
        <FormHistoryObserver
          watch={methods.watch}
          getValues={methods.getValues}
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
    ),
    [
      methods,
      activeTab,
      initialForm.id,
      initialForm._count?.submissions,
      handleSave,
      handleUndo,
      handleRedo,
      handleDiscard,
      handleAddQuestion,
      handleDuplicateQuestion,
      handleDeleteQuestion,
    ],
  );
}
