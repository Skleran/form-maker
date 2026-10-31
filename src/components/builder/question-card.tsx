'use client';

import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  GripHorizontal,
  Plus,
  Settings2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useBuilderStore } from '@/stores/use-builder-store';
import type { FormBuilderValues } from '@/lib/validations/form';
import type { QuestionType } from '@/types/form';
import { cn } from '@/lib/utils';
import { dict } from '@/lib/dictionary';
import { QuestionIcon } from '@/components/form/question-icon';
import { formatFileLimitsDescription } from '@/lib/file-types';
import { QUESTION_TYPES, useChangeQuestionType } from './question-types';

/**
 * Elements inside a question card that act as inline "quick access" controls.
 * Clicks/taps on these must never open the settings drawer.
 */
const CARD_QUICK_ACTION_SELECTOR = [
  'input:not(:disabled)',
  'textarea:not(:disabled)',
  'select',
  'button',
  'a[href]',
  'label',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="combobox"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[data-card-quick-action]',
].join(',');


const TYPE_SELECT_ITEMS = QUESTION_TYPES.map((t) => {
  const Icon = t.icon;
  return (
    <SelectItem key={t.value} value={t.value}>
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 text-muted-foreground" />
        <span>{t.label}</span>
      </div>
    </SelectItem>
  );
});

function renderSelectedType(val: string | null) {
  const selected = QUESTION_TYPES.find((t) => t.value === val);
  if (!selected) return 'Tür seçin';
  const Icon = selected.icon;
  return (
    <span className="flex items-center gap-1.5 truncate">
      <Icon className="size-3.5 text-muted-foreground shrink-0" />
      <span className="truncate">{selected.label}</span>
    </span>
  );
}

const QuestionTypeSelect = React.memo(function QuestionTypeSelect({
  value,
  onChange,
}: {
  value: QuestionType;
  onChange: (val: QuestionType) => void;
}) {
  const handleValueChange = React.useCallback(
    (val: string | null) => {
      if (!val) return;
      onChange(val as QuestionType);
    },
    [onChange],
  );

  return (
    <div
      className="flex items-center gap-2 self-end sm:self-auto shrink-0"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger className="w-44 h-8 text-xs">
          <SelectValue>{renderSelectedType}</SelectValue>
        </SelectTrigger>
        <SelectContent>{TYPE_SELECT_ITEMS}</SelectContent>
      </Select>
    </div>
  );
});

/**
 * Isolated leaf watcher for question icon so changing icon or other config fields
 * only re-renders this tiny badge instead of the whole QuestionCard.
 */
const QuestionCardIcon = React.memo(function QuestionCardIcon({
  index,
}: {
  index: number;
}) {
  const { control } = useFormContext<FormBuilderValues>();
  const icon = useWatch({
    control,
    name: `questions.${index}.config.icon`,
    exact: true,
  });

  if (!icon) return null;

  return (
    <div
      className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0"
      title={`İkon: ${icon}`}
    >
      <QuestionIcon name={icon} className="size-4" />
    </div>
  );
});

/**
 * Isolated leaf watcher for helper description so typing in Helper Description
 * inside BuilderInspector only updates this paragraph element.
 */
const QuestionCardDescription = React.memo(function QuestionCardDescription({
  index,
}: {
  index: number;
}) {
  const { control } = useFormContext<FormBuilderValues>();
  const description = useWatch({
    control,
    name: `questions.${index}.config.description`,
    exact: true,
  });

  if (!description) return null;

  return (
    <p className="text-xs text-muted-foreground mb-3 px-1">{description}</p>
  );
});

const QuestionTextPreview = React.memo(function QuestionTextPreview({
  index,
  type,
}: {
  index: number;
  type: 'SHORT_TEXT' | 'LONG_TEXT';
}) {
  const { control } = useFormContext<FormBuilderValues>();
  const placeholder = useWatch({
    control,
    name: `questions.${index}.config.placeholder`,
    exact: true,
  });

  if (type === 'SHORT_TEXT') {
    return (
      <Input
        disabled
        placeholder={placeholder || dict.builder.canvas.shortTextPlaceholder}
        className="pointer-events-none border-dashed bg-muted/20 text-xs text-muted-foreground"
      />
    );
  }

  return (
    <Textarea
      disabled
      rows={3}
      placeholder={placeholder || dict.builder.canvas.longTextPlaceholder}
      className="pointer-events-none border-dashed bg-muted/20 text-xs text-muted-foreground resize-none"
    />
  );
});

const QuestionChoiceOptionsList = React.memo(
  function QuestionChoiceOptionsList({
    index,
    type,
  }: {
    index: number;
    type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'DROPDOWN';
  }) {
    const { control, register, getValues, setValue } =
      useFormContext<FormBuilderValues>();

    // Watch ONLY option IDs as a serialized string so typing in an option's label input
    // causes 0 re-renders of the option list or QuestionCard!
    const computeOptionIdsKey = React.useCallback(
      (
        options:
          | NonNullable<FormBuilderValues['questions'][number]>['options']
          | undefined,
      ) => (options || []).map((opt, idx) => opt?.id || String(idx)).join('|'),
      [],
    );

    const optionIdsKey = useWatch({
      control,
      name: `questions.${index}.options`,
      exact: true,
      compute: computeOptionIdsKey,
    });

    const optionIds = React.useMemo(
      () => (optionIdsKey ? optionIdsKey.split('|') : []),
      [optionIdsKey],
    );

    return (
      <div className="space-y-2">
        {optionIds.map((optId, optIndex) => (
          <div
            key={optId || optIndex}
            data-card-quick-action
            className="flex items-center gap-2.5"
          >
            {type === 'SINGLE_CHOICE' && (
              <div className="size-4 rounded-full border border-muted-foreground/50 shrink-0" />
            )}
            {type === 'MULTIPLE_CHOICE' && (
              <div className="size-4 rounded border border-muted-foreground/50 shrink-0" />
            )}
            {type === 'DROPDOWN' && (
              <span className="text-xs text-muted-foreground shrink-0 w-4 font-mono">
                {optIndex + 1}.
              </span>
            )}

            <Input
              placeholder={dict.builder.canvas.optionPlaceholder.replace(
                '{index}',
                String(optIndex + 1),
              )}
              {...register(`questions.${index}.options.${optIndex}.label`)}
              className="h-8 text-xs"
            />

            {optionIds.length > 1 && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  const current = getValues(`questions.${index}.options`) || [];
                  const updated = current.filter((_, i) => i !== optIndex);
                  setValue(`questions.${index}.options`, updated, {
                    shouldDirty: true,
                  });
                }}
                className="text-muted-foreground hover:text-destructive cursor-pointer"
                title={dict.builder.canvas.removeOption}
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>
        ))}

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            const current = getValues(`questions.${index}.options`) || [];
            const newOption = {
              id: `opt_${Date.now()}_${current.length + 1}`,
              label: dict.builder.canvas.optionPlaceholder.replace(
                '{index}',
                String(current.length + 1),
              ),
            };
            setValue(`questions.${index}.options`, [...current, newOption], {
              shouldDirty: true,
            });
          }}
          className="cursor-pointer text-xs text-primary hover:text-primary/80 gap-1.5 h-7 px-2 font-medium"
        >
          <Plus className="size-3" />
          {dict.builder.canvas.addOption}
        </Button>
      </div>
    );
  },
);

const QuestionFileUploadPreview = React.memo(
  function QuestionFileUploadPreview({ index }: { index: number }) {
    const { control } = useFormContext<FormBuilderValues>();
    const [maxFileSizeMb, allowedMimeTypes] = useWatch({
      control,
      name: [
        `questions.${index}.config.maxFileSizeMb`,
        `questions.${index}.config.allowedMimeTypes`,
      ],
      exact: true,
    });

    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 text-center bg-muted/10">
        <Upload className="size-8 text-muted-foreground mb-2" />
        <p className="text-xs font-medium text-foreground">
          {dict.builder.canvas.fileZoneTitle}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {formatFileLimitsDescription(
            maxFileSizeMb,
            allowedMimeTypes,
          )}
        </p>
      </div>
    );
  },
);

const QuestionCardBodyPreview = React.memo(function QuestionCardBodyPreview({
  index,
  type,
}: {
  index: number;
  type: QuestionType;
}) {
  return (
    <div className="py-2 px-1">
      {(type === 'SHORT_TEXT' || type === 'LONG_TEXT') && (
        <QuestionTextPreview index={index} type={type} />
      )}

      {(type === 'SINGLE_CHOICE' ||
        type === 'MULTIPLE_CHOICE' ||
        type === 'DROPDOWN') && (
        <QuestionChoiceOptionsList index={index} type={type} />
      )}

      {type === 'FILE_UPLOAD' && <QuestionFileUploadPreview index={index} />}
    </div>
  );
});

const QuestionCardRequiredSwitch = React.memo(
  function QuestionCardRequiredSwitch({ index }: { index: number }) {
    const { control, setValue } = useFormContext<FormBuilderValues>();
    const required = useWatch({
      control,
      name: `questions.${index}.required`,
      exact: true,
    });

    const handleCheckedChange = React.useCallback(
      (checked: boolean) => {
        setValue(`questions.${index}.required`, checked, {
          shouldDirty: true,
        });
      },
      [index, setValue],
    );

    return (
      <div className="flex items-center gap-2 border-r pr-3">
        <Label
          htmlFor={`questions.${index}.required`}
          className="flex items-center text-xs font-medium text-foreground select-none"
        >
          {' '}
          <span className="text-xs text-muted-foreground">
            {dict.builder.canvas.required}
          </span>
        </Label>

        <Switch
          id={`questions.${index}.required`}
          checked={Boolean(required)}
          onCheckedChange={handleCheckedChange}
        />
      </div>
    );
  },
);

interface QuestionCardProps {
  fieldId: string;
  index: number;
  isLast: boolean;
  isHeld: boolean;
  showDropSlotBefore: boolean;
  showDropSlotAfter: boolean;
  activeDragIndex: number | null;
  onRegisterRef: (index: number, el: HTMLDivElement | null) => void;
  onGripPointerDown: (
    e: React.PointerEvent<HTMLDivElement>,
    index: number,
  ) => void;
  onMoveQuestion: (fromIndex: number, toIndex: number) => void;
  onDuplicateQuestion: (index: number) => void;
  onDeleteQuestion: (index: number) => void;
}

export const QuestionCard = React.memo(function QuestionCard({
  fieldId,
  index,
  isLast,
  isHeld,
  showDropSlotBefore,
  showDropSlotAfter,
  activeDragIndex,
  onRegisterRef,
  onGripPointerDown,
  onMoveQuestion,
  onDuplicateQuestion,
  onDeleteQuestion,
}: QuestionCardProps) {
  const { register, control } = useFormContext<FormBuilderValues>();

  // Watch ONLY primitive id and type at the card level with exact: true
  const watchedId = useWatch({
    control,
    name: `questions.${index}.id`,
    exact: true,
  });
  const watchedType = useWatch({
    control,
    name: `questions.${index}.type`,
    exact: true,
  });

  const questionId = watchedId || fieldId;
  const questionType: QuestionType = watchedType || 'SHORT_TEXT';

  // Derived boolean selector: only re-renders when THIS card's active status flips between true and false
  const isActive = useBuilderStore(
    React.useCallback(
      (s) =>
        s.isInspectorOpen &&
        (s.activeQuestionId === questionId || s.activeQuestionId === fieldId),
      [questionId, fieldId],
    ),
  );

  const handleCardRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      onRegisterRef(index, el);
    },
    [index, onRegisterRef],
  );

  const handleCardClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Inline controls (title input, type select, options, footer buttons) are quick access
      // and must never open the inspector drawer. Only clicks on empty card space (or the settings button) do.
      const target = e.target as Element;
      // Clicks bubbling through React portals (e.g. Select popup items) aren't card clicks
      if (!e.currentTarget.contains(target)) return;
      const interactive = target.closest(CARD_QUICK_ACTION_SELECTOR);
      if (interactive && e.currentTarget.contains(interactive)) return;
      useBuilderStore.getState().selectQuestion(questionId);
    },
    [questionId],
  );

  const handleOpenSettings = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      useBuilderStore.getState().selectQuestion(questionId);
    },
    [questionId],
  );

  const handleTypeChange = useChangeQuestionType(index);

  return (
    <>
      {/* Dynamic Drop Slot indicator (When moving UP: shows ABOVE the target card) */}
      {showDropSlotBefore && activeDragIndex !== null && (
        <div className="h-12 rounded-xl border-2 border-dashed border-primary bg-primary/10 flex items-center justify-center gap-2 text-xs font-semibold text-primary animate-pulse transition-all shadow-xs my-1 select-none">
          <ArrowUp className="size-4 animate-bounce" />
          <span>
            {`Buraya Taşı (#${activeDragIndex + 1} → #${index + 1})`}
          </span>
        </div>
      )}

      <Card
        ref={handleCardRef}
        onClick={handleCardClick}
        className={cn(
          'relative p-6 shadow-sm transition-all duration-150 cursor-pointer border bg-card overflow-visible',
          isHeld &&
            'opacity-25 border-dashed border-primary/60 scale-[0.99] bg-muted/30',
          !isHeld && isActive
            ? 'sm:ring-2 sm:ring-primary/30 shadow-md'
            : !isHeld && 'hover:border-border/80 hover:shadow',
        )}
      >
        {/* Top Center Drag Grip Handle */}
        <div
          data-card-quick-action
          onPointerDown={(e) => onGripPointerDown(e, index)}
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex h-6 w-12 cursor-grab active:cursor-grabbing items-center justify-center rounded-md border bg-card text-muted-foreground shadow-xs hover:bg-muted hover:text-foreground hover:scale-105 active:scale-95 transition-all select-none touch-none group"
          title="Soruyu taşımak için basılı tutun ve sürükleyin"
        >
          <GripHorizontal className="size-4 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
        </div>

        {/* Question Header & Type Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 w-full sm:w-auto min-w-0 flex-1">
            <span className="text-xs font-semibold text-muted-foreground rounded-full size-6 flex items-center justify-center bg-muted shrink-0">
              {index + 1}
            </span>
            <QuestionCardIcon index={index} />
            <Input
              placeholder={dict.builder.canvas.questionTitlePlaceholder}
              {...register(`questions.${index}.label`)}
              className="font-medium text-base h-9"
            />

            {/* Mobile (< sm): opens the question settings drawer */}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleOpenSettings}
              className={cn(
                'sm:hidden shrink-0 cursor-pointer',
                isActive
                  ? 'text-primary bg-primary/10 hover:bg-primary/15 hover:text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              title="Soru ayarları"
              aria-label="Soru ayarları"
            >
              <Settings2 className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
            <QuestionTypeSelect
              value={questionType}
              onChange={handleTypeChange}
            />

            {/* Desktop / Tablet (>= sm): opens the question settings drawer */}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleOpenSettings}
              className={cn(
                'hidden sm:inline-flex shrink-0 cursor-pointer',
                isActive
                  ? 'text-primary bg-primary/10 hover:bg-primary/15 hover:text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              title="Soru ayarları"
              aria-label="Soru ayarları"
            >
              <Settings2 className="size-4" />
            </Button>
          </div>
        </div>

        {/* Question Subtitle / Description if configured */}
        <QuestionCardDescription index={index} />

        {/* Field Interactive Body Preview */}
        <QuestionCardBodyPreview index={index} type={questionType} />

        <Separator className="my-3" />

        {/* Card Footer: Reorder, Required Toggle, Duplicate, Delete */}
        <div className="flex items-center justify-between pt-1 min-h-8">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={index === 0}
              onClick={(e) => {
                e.stopPropagation();
                onMoveQuestion(index, index - 1);
              }}
              className="cursor-pointer text-muted-foreground hover:text-foreground"
              title={dict.builder.canvas.moveUp}
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={isLast}
              onClick={(e) => {
                e.stopPropagation();
                onMoveQuestion(index, index + 1);
              }}
              className="cursor-pointer text-muted-foreground hover:text-foreground"
              title={dict.builder.canvas.moveDown}
            >
              <ArrowDown className="size-3.5" />
            </Button>
            <span className="text-[11px] text-muted-foreground font-mono ml-1">
              #{index + 1}
            </span>
          </div>

          {/* Clickable middle area between move buttons and required switch */}
          <div
            className="flex-1 self-stretch cursor-pointer min-w-4"
            aria-hidden="true"
          />

          <div className="flex items-center gap-3">
            <QuestionCardRequiredSwitch index={index} />

            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicateQuestion(index);
              }}
              className="cursor-pointer text-muted-foreground hover:text-foreground"
              title={dict.builder.canvas.duplicateQuestion}
            >
              <Copy className="size-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteQuestion(index);
                const state = useBuilderStore.getState();
                if (
                  state.activeQuestionId === questionId ||
                  state.activeQuestionId === fieldId
                ) {
                  state.deselectQuestion();
                }
              }}
              className="cursor-pointer text-muted-foreground hover:text-destructive"
              title={dict.builder.canvas.deleteQuestion}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Dynamic Drop Slot indicator (When moving DOWN: shows BELOW the target card) */}
      {showDropSlotAfter && activeDragIndex !== null && (
        <div className="h-12 rounded-xl border-2 border-dashed border-primary bg-primary/10 flex items-center justify-center gap-2 text-xs font-semibold text-primary animate-pulse transition-all shadow-xs my-1 select-none">
          <ArrowDown className="size-4 animate-bounce" />
          <span>
            {`Buraya Taşı (#${activeDragIndex + 1} → #${index + 1})`}
          </span>
        </div>
      )}
    </>
  );
});
