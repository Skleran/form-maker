'use client';

import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import {
  AlignLeft,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Copy,
  FileUp,
  Radio,
  SlidersHorizontal,
  Trash2,
  Type,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBuilderStore } from '@/stores/use-builder-store';
import type { FormBuilderValues } from '@/lib/validations/form';
import type { QuestionType } from '@/types/form';
import { useLanguage } from '@/lib/i18n/language-context';
import { QUESTION_ICON_OPTIONS } from '@/components/form/question-icon';
import { Label } from '../ui/label';

interface BuilderInspectorProps {
  onDuplicateQuestion: (index: number) => void;
  onDeleteQuestion: (index: number) => void;
}

interface QuestionTypeItem {
  value: QuestionType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MimePresetItem {
  label: string;
  value: string;
}

// Pre-build static icon SelectItem list once at module level so 26 items aren't re-created on every render
const ICON_SELECT_ITEMS = QUESTION_ICON_OPTIONS.map((opt) => {
  const Icon = opt.icon;
  return (
    <SelectItem key={opt.value} value={opt.value} className="text-xs">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 text-primary shrink-0" />
        <span>{opt.label}</span>
      </div>
    </SelectItem>
  );
});

const InspectorTypeSelect = React.memo(function InspectorTypeSelect({
  activeIndex,
  questionTypesList,
}: {
  activeIndex: number;
  questionTypesList: QuestionTypeItem[];
}) {
  const { dict, language } = useLanguage();
  const { control, setValue, getValues } = useFormContext<FormBuilderValues>();

  const questionType = useWatch({
    control,
    name: `questions.${activeIndex}.type`,
    exact: true,
  });

  const handleValueChange = React.useCallback(
    (val: string | null) => {
      if (!val) return;
      const typedVal = val as QuestionType;
      setValue(`questions.${activeIndex}.type`, typedVal, {
        shouldDirty: true,
      });
      const currentOptions = getValues(`questions.${activeIndex}.options`);
      if (
        ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN'].includes(typedVal) &&
        (!currentOptions || currentOptions.length === 0)
      ) {
        setValue(`questions.${activeIndex}.options`, [
          {
            id: `opt_${Date.now()}_1`,
            label: language === 'tr' ? 'Seçenek 1' : 'Option 1',
          },
        ]);
      }
    },
    [activeIndex, getValues, language, setValue],
  );

  const renderSelectedValue = React.useCallback(
    (val: string | null) => {
      const selected = questionTypesList.find((t) => t.value === val);
      if (!selected) return dict.builder.inspector.selectType;
      const Icon = selected.icon;
      return (
        <span className="flex items-center gap-1.5 truncate">
          <Icon className="size-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">{selected.label}</span>
        </span>
      );
    },
    [questionTypesList, dict.builder.inspector.selectType],
  );

  const selectItems = React.useMemo(
    () =>
      questionTypesList.map((t) => {
        const Icon = t.icon;
        return (
          <SelectItem key={t.value} value={t.value} className="text-xs">
            <div className="flex items-center gap-2">
              <Icon className="size-3.5 text-muted-foreground" />
              <span>{t.label}</span>
            </div>
          </SelectItem>
        );
      }),
    [questionTypesList],
  );

  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {dict.builder.inspector.fieldType}
      </label>
      <Select
        value={questionType || 'SHORT_TEXT'}
        onValueChange={handleValueChange}
      >
        <SelectTrigger className="w-full h-8 text-xs">
          <SelectValue placeholder={dict.builder.inspector.selectType}>
            {renderSelectedValue}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>{selectItems}</SelectContent>
      </Select>
    </div>
  );
});

const InspectorIconSelect = React.memo(function InspectorIconSelect({
  activeIndex,
}: {
  activeIndex: number;
}) {
  const { language } = useLanguage();
  const { control, setValue } = useFormContext<FormBuilderValues>();

  const currentIcon = useWatch({
    control,
    name: `questions.${activeIndex}.config.icon`,
    exact: true,
  });

  const handleRemoveIcon = React.useCallback(() => {
    setValue(`questions.${activeIndex}.config.icon`, undefined, {
      shouldDirty: true,
    });
  }, [activeIndex, setValue]);

  const handleValueChange = React.useCallback(
    (val: string | null) => {
      const nextVal = !val || val === 'none' ? undefined : val;
      setValue(`questions.${activeIndex}.config.icon`, nextVal, {
        shouldDirty: true,
      });
    },
    [activeIndex, setValue],
  );

  const renderSelectedValue = React.useCallback(
    (val: string | null) => {
      if (!val || val === 'none')
        return language === 'tr' ? 'Yok (İkonsuz)' : 'None (No icon)';
      const iconOpt = QUESTION_ICON_OPTIONS.find((item) => item.value === val);
      if (!iconOpt) return language === 'tr' ? 'Yok (İkonsuz)' : 'None';
      const Icon = iconOpt.icon;
      return (
        <span className="flex items-center gap-1.5 truncate">
          <Icon className="size-3.5 text-primary shrink-0" />
          <span className="truncate">{iconOpt.label}</span>
        </span>
      );
    },
    [language],
  );

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {language === 'tr' ? 'Soru İkonu' : 'Question Icon'}
        </label>
        {currentIcon && (
          <button
            type="button"
            onClick={handleRemoveIcon}
            className="text-[10px] text-muted-foreground hover:text-destructive underline cursor-pointer"
          >
            {language === 'tr' ? 'Kaldır' : 'Remove'}
          </button>
        )}
      </div>
      <Select value={currentIcon || 'none'} onValueChange={handleValueChange}>
        <SelectTrigger className="w-full h-8 text-xs">
          <SelectValue
            placeholder={
              language === 'tr' ? 'İkon seçin...' : 'Select icon...'
            }
          >
            {renderSelectedValue}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-56">
          <SelectItem value="none" className="text-xs">
            <span className="text-muted-foreground">
              {language === 'tr' ? 'Yok (İkonsuz)' : 'None (No icon)'}
            </span>
          </SelectItem>
          {ICON_SELECT_ITEMS}
        </SelectContent>
      </Select>
    </div>
  );
});

const InspectorRequiredSwitch = React.memo(function InspectorRequiredSwitch({
  activeIndex,
}: {
  activeIndex: number;
}) {
  const { dict } = useLanguage();
  const { control, setValue } = useFormContext<FormBuilderValues>();

  const required = useWatch({
    control,
    name: `questions.${activeIndex}.required`,
    exact: true,
  });

  const handleCheckedChange = React.useCallback(
    (checked: boolean) => {
      setValue(`questions.${activeIndex}.required`, checked, {
        shouldDirty: true,
      });
    },
    [activeIndex, setValue],
  );

  const switchId = `inspector.questions.${activeIndex}.required`;

  return (
    <div className="flex items-center rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5">
      <Label htmlFor={switchId} className="flex-1">
        <div className="space-y-0.5">
          <span className="text-xs font-medium text-foreground">
            {dict.builder.inspector.requiredField}
          </span>
          <p className="text-[10px] text-muted-foreground/80 leading-3.5">
            {dict.builder.inspector.requiredDesc}
          </p>
        </div>
      </Label>

      <Switch
        id={switchId}
        checked={Boolean(required)}
        onCheckedChange={handleCheckedChange}
      />
    </div>
  );
});

const InspectorDescriptionField = React.memo(
  function InspectorDescriptionField({
    activeIndex,
    questionId,
  }: {
    activeIndex: number;
    questionId: string;
  }) {
    const { dict } = useLanguage();
    const { register } = useFormContext<FormBuilderValues>();

    return (
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {dict.builder.inspector.descriptionHelp}
        </label>
        <Textarea
          key={questionId || activeIndex}
          rows={2}
          placeholder={dict.builder.inspector.descriptionPlaceholder}
          {...register(`questions.${activeIndex}.config.description`)}
          className="text-xs resize-none py-1.5 min-h-[48px]"
        />
      </div>
    );
  },
);

const InspectorTextLimitsFields = React.memo(
  function InspectorTextLimitsFields({
    activeIndex,
  }: {
    activeIndex: number;
  }) {
    const { language } = useLanguage();
    const { control, setValue } = useFormContext<FormBuilderValues>();

    const [minLength, maxLength] = useWatch({
      control,
      name: [
        `questions.${activeIndex}.config.minLength`,
        `questions.${activeIndex}.config.maxLength`,
      ],
      exact: true,
    });

    return (
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {language === 'tr' ? 'Metin Sınırları' : 'Text Limits'}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground">
              {language === 'tr' ? 'Min karakter' : 'Min chars'}
            </span>
            <Input
              type="number"
              min={0}
              placeholder={language === 'tr' ? 'Yok' : 'None'}
              value={minLength ?? ''}
              onChange={(e) => {
                const val =
                  e.target.value === '' ? undefined : Number(e.target.value);
                setValue(`questions.${activeIndex}.config.minLength`, val, {
                  shouldDirty: true,
                });
              }}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground">
              {language === 'tr' ? 'Maks karakter' : 'Max chars'}
            </span>
            <Input
              type="number"
              min={1}
              placeholder={language === 'tr' ? 'Yok' : 'None'}
              value={maxLength ?? ''}
              onChange={(e) => {
                const val =
                  e.target.value === '' ? undefined : Number(e.target.value);
                setValue(`questions.${activeIndex}.config.maxLength`, val, {
                  shouldDirty: true,
                });
              }}
              className="h-7 text-xs"
            />
          </div>
        </div>
      </div>
    );
  },
);

const InspectorFileUploadFields = React.memo(
  function InspectorFileUploadFields({
    activeIndex,
    allowedMimePresets,
  }: {
    activeIndex: number;
    allowedMimePresets: MimePresetItem[];
  }) {
    const { dict, language } = useLanguage();
    const { control, setValue } = useFormContext<FormBuilderValues>();

    const [maxFileSizeMb, allowedMimeTypes] = useWatch({
      control,
      name: [
        `questions.${activeIndex}.config.maxFileSizeMb`,
        `questions.${activeIndex}.config.allowedMimeTypes`,
      ],
      exact: true,
    });

    const currentMimes = allowedMimeTypes || [];

    return (
      <div className="space-y-2.5">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {dict.builder.inspector.fileLimitsTitle}
        </label>
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">
            {dict.builder.inspector.maxFileSize}
          </span>
          <Select
            value={String(maxFileSizeMb || 10)}
            onValueChange={(val) =>
              setValue(
                `questions.${activeIndex}.config.maxFileSizeMb`,
                Number(val),
                {
                  shouldDirty: true,
                },
              )
            }
          >
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue placeholder="10 MB">
                {(val: string | null) => (val ? `${val} MB` : '10 MB')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5" className="text-xs">
                5 MB
              </SelectItem>
              <SelectItem value="10" className="text-xs">
                10 MB ({language === 'tr' ? 'Varsayılan' : 'Default'})
              </SelectItem>
              <SelectItem value="25" className="text-xs">
                25 MB
              </SelectItem>
              <SelectItem value="50" className="text-xs">
                50 MB
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">
            {dict.builder.inspector.allowedTypes}
          </span>
          <div className="space-y-1.5 rounded-md border border-border/60 bg-muted/15 p-2">
            {allowedMimePresets.map((preset) => {
              const isChecked = currentMimes.includes(preset.value);

              return (
                <label
                  key={preset.value}
                  className="flex items-center gap-2 text-[11px] text-foreground cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...currentMimes, preset.value]
                        : currentMimes.filter((m) => m !== preset.value);
                      setValue(
                        `questions.${activeIndex}.config.allowedMimeTypes`,
                        updated,
                        { shouldDirty: true },
                      );
                    }}
                    className="size-3.5 rounded border-muted-foreground/30 accent-primary"
                  />
                  <span className="truncate">{preset.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    );
  },
);

const InspectorTypeDependentFields = React.memo(
  function InspectorTypeDependentFields({
    activeIndex,
    questionId,
    allowedMimePresets,
  }: {
    activeIndex: number;
    questionId: string;
    allowedMimePresets: MimePresetItem[];
  }) {
    const { dict } = useLanguage();
    const { control, register } = useFormContext<FormBuilderValues>();

    const questionType = useWatch({
      control,
      name: `questions.${activeIndex}.type`,
      exact: true,
    });

    return (
      <>
        {/* Field Placeholder (for Text inputs) */}
        {(questionType === 'SHORT_TEXT' ||
          questionType === 'LONG_TEXT' ||
          questionType === 'DROPDOWN') && (
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {dict.builder.inspector.placeholder}
            </label>
            <Input
              key={questionId || activeIndex}
              placeholder={dict.builder.inspector.placeholderField}
              {...register(`questions.${activeIndex}.config.placeholder`)}
              className="h-8 text-xs"
            />
          </div>
        )}

        {/* Text Constraints: Min / Max Length */}
        {(questionType === 'SHORT_TEXT' || questionType === 'LONG_TEXT') && (
          <InspectorTextLimitsFields activeIndex={activeIndex} />
        )}

        {/* File Upload Configuration */}
        {questionType === 'FILE_UPLOAD' && (
          <InspectorFileUploadFields
            activeIndex={activeIndex}
            allowedMimePresets={allowedMimePresets}
          />
        )}
      </>
    );
  },
);

export const BuilderInspector = React.memo(function BuilderInspector({
  onDuplicateQuestion,
  onDeleteQuestion,
}: BuilderInspectorProps) {
  const { dict, language } = useLanguage();
  const isMobile = useIsMobile();
  const activeQuestionId = useBuilderStore((s) => s.activeQuestionId);
  const lastActiveQuestionId = useBuilderStore((s) => s.lastActiveQuestionId);
  const isInspectorOpen = useBuilderStore((s) => s.isInspectorOpen);
  const setActiveQuestionId = useBuilderStore((s) => s.setActiveQuestionId);
  const deselectQuestion = useBuilderStore((s) => s.deselectQuestion);

  const { control } = useFormContext<FormBuilderValues>();

  // Watch ONLY the list of question IDs as a primitive pipe-delimited string.
  // Typing in any question's label, description, placeholder, or options produces the exact same string
  // and causes 0 re-renders of BuilderInspector.
  const computeQuestionIdsKey = React.useCallback(
    (questions: FormBuilderValues['questions'] | undefined) =>
      (questions || []).map((q, idx) => q?.id || String(idx)).join('|'),
    [],
  );

  const questionIdsKey = useWatch({
    control,
    name: 'questions',
    compute: computeQuestionIdsKey,
  });

  const questionIds = React.useMemo(
    () => (questionIdsKey ? questionIdsKey.split('|') : []),
    [questionIdsKey],
  );

  const questionTypesList = React.useMemo<QuestionTypeItem[]>(
    () => [
      {
        value: 'SHORT_TEXT',
        label: dict.builder.canvas.questionTypes.SHORT_TEXT,
        icon: Type,
      },
      {
        value: 'LONG_TEXT',
        label: dict.builder.canvas.questionTypes.LONG_TEXT,
        icon: AlignLeft,
      },
      {
        value: 'SINGLE_CHOICE',
        label: dict.builder.canvas.questionTypes.SINGLE_CHOICE,
        icon: Radio,
      },
      {
        value: 'MULTIPLE_CHOICE',
        label: dict.builder.canvas.questionTypes.MULTIPLE_CHOICE,
        icon: CheckSquare,
      },
      {
        value: 'DROPDOWN',
        label: dict.builder.canvas.questionTypes.DROPDOWN,
        icon: ChevronDown,
      },
      {
        value: 'FILE_UPLOAD',
        label: dict.builder.canvas.questionTypes.FILE_UPLOAD,
        icon: FileUp,
      },
    ],
    [dict],
  );

  const allowedMimePresets = React.useMemo<MimePresetItem[]>(
    () => [
      {
        label: dict.builder.inspector.presetTypes.pdf,
        value: 'application/pdf',
      },
      { label: dict.builder.inspector.presetTypes.images, value: 'image/*' },
      {
        label: dict.builder.inspector.presetTypes.word,
        value:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
      {
        label: dict.builder.inspector.presetTypes.spreadsheets,
        value:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv',
      },
      {
        label: dict.builder.inspector.presetTypes.zip,
        value: 'application/zip',
      },
    ],
    [dict],
  );

  const resolvedIndex = React.useMemo(() => {
    if (!activeQuestionId) return -1;
    return questionIds.indexOf(activeQuestionId);
  }, [activeQuestionId, questionIds]);

  const resolvedQuestionId =
    resolvedIndex !== -1 ? questionIds[resolvedIndex] : undefined;

  // During exit animation (!isInspectorOpen), retain previous question via lastActiveQuestionId so it smoothly slides out
  const targetQuestionId =
    resolvedQuestionId ||
    (!isInspectorOpen && lastActiveQuestionId
      ? lastActiveQuestionId
      : undefined);

  const activeIndex: number = React.useMemo(() => {
    if (resolvedIndex !== -1) return resolvedIndex;
    if (!isInspectorOpen && targetQuestionId) {
      return questionIds.indexOf(targetQuestionId);
    }
    return -1;
  }, [resolvedIndex, isInspectorOpen, targetQuestionId, questionIds]);

  const activeQuestionIdForRender =
    activeIndex !== -1 ? questionIds[activeIndex] : undefined;
  const hasActiveQuestion = Boolean(
    activeQuestionIdForRender && activeIndex >= 0,
  );

  const totalQuestions = questionIds.length;

  const handlePrevQuestion = React.useCallback(() => {
    if (activeIndex > 0) {
      const prevId = questionIds[activeIndex - 1];
      if (prevId) setActiveQuestionId(prevId);
    }
  }, [activeIndex, questionIds, setActiveQuestionId]);

  const handleNextQuestion = React.useCallback(() => {
    if (activeIndex < totalQuestions - 1) {
      const nextId = questionIds[activeIndex + 1];
      if (nextId) setActiveQuestionId(nextId);
    }
  }, [activeIndex, totalQuestions, questionIds, setActiveQuestionId]);

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        deselectQuestion();
      }
    },
    [deselectQuestion],
  );

  const renderInspectorContent = () => {
    if (!hasActiveQuestion || !activeQuestionIdForRender) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground p-4">
          <div className="size-9 rounded-full bg-muted flex items-center justify-center mb-2.5">
            <SlidersHorizontal className="size-4 text-muted-foreground/70" />
          </div>
          <p className="text-xs font-semibold text-foreground">
            {dict.builder.inspector.emptyTitle}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px]">
            {dict.builder.inspector.emptyDesc}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3.5">
        {/* Field Type Selector */}
        <InspectorTypeSelect
          activeIndex={activeIndex}
          questionTypesList={questionTypesList}
        />

        {/* Question Icon Selector */}
        <InspectorIconSelect activeIndex={activeIndex} />

        {/* Required Field Toggle */}
        <InspectorRequiredSwitch activeIndex={activeIndex} />

        <Separator />

        {/* Helper Description */}
        <InspectorDescriptionField
          activeIndex={activeIndex}
          questionId={activeQuestionIdForRender}
        />

        {/* Type-dependent fields: Placeholder, Text Limits, or File Upload Config */}
        <InspectorTypeDependentFields
          activeIndex={activeIndex}
          questionId={activeQuestionIdForRender}
          allowedMimePresets={allowedMimePresets}
        />

        <Separator />

        {/* Quick Actions */}
        <div className="space-y-1.5 pt-0.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {language === 'tr' ? 'Kart İşlemleri' : 'Card Actions'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={() => onDuplicateQuestion(activeIndex)}
              className="cursor-pointer gap-1.5 text-xs h-7 w-full"
            >
              <Copy className="size-3 text-muted-foreground" />
              {dict.builder.inspector.duplicate}
            </Button>
            <Button
              variant="destructive"
              size="xs"
              onClick={() => {
                onDeleteQuestion(activeIndex);
              }}
              className="cursor-pointer gap-1.5 text-xs h-7 w-full"
            >
              <Trash2 className="size-3" />
              {dict.builder.inspector.delete}
            </Button>
          </div>
        </div>

        {/* Meta Info */}
        <div className="rounded border border-border/50 bg-muted/20 px-2.5 py-1.5 text-[10px] text-muted-foreground flex items-center justify-between font-mono">
          <span>
            {language === 'tr'
              ? `Sıra #${activeIndex + 1}`
              : `Position #${activeIndex + 1}`}
          </span>
          <span className="truncate max-w-[120px]">
            {activeQuestionIdForRender}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Drawer
      open={Boolean(isInspectorOpen && resolvedQuestionId)}
      onOpenChange={handleOpenChange}
      showSwipeHandle={isMobile ? true : false}
      swipeDirection={isMobile ? 'down' : 'right'}
      modal={isMobile ? true : false}
      disablePointerDismissal={!isMobile}
    >
      <DrawerContent
        // Keep the DrawerPortal mounted so opening/closing the inspector doesn't mount/unmount
        // Base UI FloatingPortal, 26 SelectItems, and ResizeObserver on every click.
        keepMounted
        initialFocus={false}
        // Don't restore focus to the previously focused card input on close:
        // on mobile that would pop the software keyboard up again.
        finalFocus={false}
        className={`max-h-[85dvh] md:max-h-full flex flex-col p-0 bg-card ${isMobile ? '' : 'mt-24.5 mr-5'}`}
      >
        <DrawerHeader className="border-b px-4 py-3 shrink-0 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <SlidersHorizontal className="size-4 text-primary shrink-0" />
            <DrawerTitle className="text-sm font-semibold truncate">
              {dict.builder.inspector.title}
            </DrawerTitle>
            {hasActiveQuestion && totalQuestions > 0 && (
              <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">
                {activeIndex + 1}/{totalQuestions}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {totalQuestions > 1 && (
              <div className="flex items-center gap-0.5 mr-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={activeIndex <= 0}
                  onClick={handlePrevQuestion}
                  className="cursor-pointer text-muted-foreground hover:text-foreground h-7 w-7"
                  title={
                    language === 'tr' ? 'Önceki soru' : 'Previous question'
                  }
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={activeIndex >= totalQuestions - 1}
                  onClick={handleNextQuestion}
                  className="cursor-pointer text-muted-foreground hover:text-foreground h-7 w-7"
                  title={language === 'tr' ? 'Sonraki soru' : 'Next question'}
                >
                  <ChevronDown className="size-4" />
                </Button>
              </div>
            )}

            <DrawerClose
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground"
                  title={dict.builder.inspector.closeInspector}
                />
              }
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </DrawerClose>
          </div>
        </DrawerHeader>

        {/* min-h-0 lets this flex child shrink below its content so it actually scrolls */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3.5">
          {renderInspectorContent()}
        </div>
      </DrawerContent>
    </Drawer>
  );
});
