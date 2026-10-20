'use client';

import * as React from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  CheckSquare,
  ChevronDown,
  Copy,
  Crop,
  FileUp,
  GripHorizontal,
  ImagePlus,
  Plus,
  Radio,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { useBuilderStore } from '@/stores/use-builder-store';
import type { FormBuilderValues } from '@/lib/validations/form';
import type { QuestionType } from '@/types/form';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import { QuestionIcon } from '@/components/form/question-icon';
import { HeaderImageCropModal } from './header-image-crop-modal';
import { formatFileLimitsDescription } from '@/lib/file-types';

interface BuilderCanvasProps {
  onDuplicateQuestion: (index: number) => void;
  onDeleteQuestion: (index: number) => void;
  onAddQuestion: (type?: QuestionType) => void;
}

interface ActiveDragState {
  index: number;
  pointerY: number;
  pointerX: number;
  initialPointerY: number;
  initialPointerX: number;
  cardRect: DOMRect;
  overIndex: number;
  questionLabel: string;
  questionType: QuestionType;
}

interface QuestionTypeOption {
  value: QuestionType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FormHeaderSection = React.memo(function FormHeaderSection() {
  const { dict, language } = useLanguage();
  const { register, control, setValue, getValues } =
    useFormContext<FormBuilderValues>();
  const [headerImage, headerImageRaw, headerImageCrop] = useWatch({
    control,
    name: ['headerImage', 'headerImageRaw', 'headerImageCrop'],
  });

  const headerImageInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedRawFile, setSelectedRawFile] = React.useState<File | null>(
    null,
  );
  const [rawImageForCrop, setRawImageForCrop] = React.useState<string | null>(
    null,
  );
  const [activeCropForModal, setActiveCropForModal] =
    React.useState<FormBuilderValues['headerImageCrop']>(null);
  const [isCropModalOpen, setIsCropModalOpen] = React.useState(false);

  const handleHeaderImageFileSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error(
        language === 'tr'
          ? 'Kapak görseli boyutu en fazla 10 MB olabilir.'
          : 'Cover image must be 10 MB or less.',
      );
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error(
        language === 'tr'
          ? 'Lütfen geçerli bir görsel dosyası seçin (PNG, JPG, WebP).'
          : 'Please select a valid image file (PNG, JPG, WebP).',
      );
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedRawFile(file);
    setRawImageForCrop(previewUrl);
    setActiveCropForModal(null);
    setIsCropModalOpen(true);
  };

  return (
    <div className="space-y-0">
      <input
        type="file"
        ref={headerImageInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleHeaderImageFileSelect(file);
          e.target.value = '';
        }}
      />

      {headerImage ? (
        <div className="relative group overflow-hidden rounded-t-xl border border-b-0 shadow-sm bg-muted/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={headerImage}
            crossOrigin={
              headerImage.startsWith('blob:') || headerImage.startsWith('data:')
                ? undefined
                : 'anonymous'
            }
            alt="Form Kapak Görseli"
            className="w-full aspect-[4/1] object-cover block"
          />
          <div className="absolute top-3 right-3 flex items-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={() => {
                const sourceImage =
                  headerImageRaw || rawImageForCrop || headerImage;
                if (sourceImage) {
                  setSelectedRawFile(null);
                  setRawImageForCrop(sourceImage);
                  setActiveCropForModal(headerImageCrop || null);
                  setIsCropModalOpen(true);
                }
              }}
              className="cursor-pointer gap-1.5 shadow-sm bg-background/85 hover:bg-background backdrop-blur-xs text-xs font-medium"
            >
              <Crop className="size-3.5 text-primary" />
              {language === 'tr' ? 'Pozisyonu Ayarla' : 'Adjust Crop'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={() => headerImageInputRef.current?.click()}
              className="cursor-pointer gap-1.5 shadow-sm bg-background/85 hover:bg-background backdrop-blur-xs text-xs font-medium"
            >
              <ImagePlus className="size-3.5 text-primary" />
              {language === 'tr' ? 'Görseli Değiştir' : 'Change Image'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon-xs"
              onClick={() => {
                useBuilderStore.getState().pushHistory(getValues());
                setValue('headerImage', null, { shouldDirty: true });
                setValue('headerImageRaw', null, { shouldDirty: true });
                setValue('headerImageCrop', null, { shouldDirty: true });
                setSelectedRawFile(null);
                setRawImageForCrop(null);
                setActiveCropForModal(null);
              }}
              className="cursor-pointer shadow-sm bg-destructive/20 hover:bg-destructive/30 dark:bg-destructive/30 dark:hover:bg-destructive/40"
              title={
                language === 'tr'
                  ? 'Kapak Görselini Kaldır'
                  : 'Remove Cover Image'
              }
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end pb-2">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => headerImageInputRef.current?.click()}
            className="cursor-pointer gap-1.5 text-xs text-muted-foreground hover:text-foreground shadow-xs bg-card hover:bg-muted/50"
          >
            <ImagePlus className="size-3.5 text-primary" />
            {language === 'tr' ? 'Kapak Görseli Ekle' : 'Add Cover Image'}
          </Button>
        </div>
      )}

      <Card
        className={cn(
          'p-6 shadow-sm bg-card transition-all',
          headerImage
            ? 'rounded-t-none border-t-0'
            : 'border-t-4 border-t-primary',
        )}
      >
        <div className="space-y-4">
          {/* Form Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="form-builder-title"
                className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 select-none"
              >
                <Type className="size-3.5 text-primary" />
                <span>{language === 'tr' ? 'Form Başlığı' : 'Form Title'}</span>
              </label>
              <span className="text-[11px] text-muted-foreground/60 select-none">
                {language === 'tr' ? 'Zorunlu' : 'Required'}
              </span>
            </div>
            <div className="group rounded-lg border border-border/90 bg-muted/70 hover:bg-muted/90 hover:border-foreground/25 focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-200 shadow-xs">
              <Input
                id="form-builder-title"
                placeholder={dict.builder.canvas.titlePlaceholder}
                {...register('title')}
                className="border-0 bg-transparent px-3.5 py-2 text-xl sm:text-2xl font-bold tracking-tight shadow-none focus-visible:ring-0 focus-visible:border-0 placeholder:text-muted-foreground/50 h-auto w-full dark:bg-transparent"
              />
            </div>
          </div>

          {/* Form Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="form-builder-description"
                className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 select-none"
              >
                <AlignLeft className="size-3.5 text-primary" />
                <span>
                  {language === 'tr' ? 'Form Açıklaması' : 'Form Description'}
                </span>
              </label>
              <span className="text-[11px] text-muted-foreground/60 select-none">
                {language === 'tr' ? 'İsteğe bağlı' : 'Optional'}
              </span>
            </div>
            <div className="group rounded-lg border border-border/90 bg-muted/70 hover:bg-muted/90 hover:border-foreground/25 focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-200 shadow-xs">
              <Textarea
                id="form-builder-description"
                placeholder={dict.builder.canvas.descPlaceholder}
                rows={2}
                {...register('description')}
                className="border-0 bg-transparent px-3.5 py-2.5 text-sm shadow-none focus-visible:ring-0 focus-visible:border-0 placeholder:text-muted-foreground/50 resize-none min-h-[56px] w-full dark:bg-transparent"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Google Forms Style Header Image Crop Modal */}
      {rawImageForCrop && (
        <HeaderImageCropModal
          key={rawImageForCrop}
          isOpen={isCropModalOpen}
          imageSrc={rawImageForCrop}
          rawFile={selectedRawFile}
          existingRawUrl={headerImageRaw || headerImage}
          initialCrop={activeCropForModal}
          onClose={() => {
            setIsCropModalOpen(false);
            if (rawImageForCrop.startsWith('blob:')) {
              URL.revokeObjectURL(rawImageForCrop);
            }
            setSelectedRawFile(null);
          }}
          onSave={(result) => {
            useBuilderStore.getState().pushHistory(getValues());

            // Track uploaded files in builder session for atomic reconciliation
            if (result.headerImage) {
              useBuilderStore
                .getState()
                .addSessionUploadedFile(result.headerImage);
            }
            if (result.headerImageRaw) {
              useBuilderStore
                .getState()
                .addSessionUploadedFile(result.headerImageRaw);
            }

            setValue('headerImage', result.headerImage, { shouldDirty: true });
            setValue('headerImageRaw', result.headerImageRaw, {
              shouldDirty: true,
            });
            setValue('headerImageCrop', result.headerImageCrop, {
              shouldDirty: true,
            });
            setActiveCropForModal(result.headerImageCrop);
            setSelectedRawFile(null);

            if (rawImageForCrop.startsWith('blob:')) {
              URL.revokeObjectURL(rawImageForCrop);
            }

            toast.success(
              language === 'tr'
                ? 'Kapak görseli başarıyla ayarlandı.'
                : 'Cover image set successfully.',
            );
          }}
        />
      )}
    </div>
  );
});

const QuestionTypeSelect = React.memo(function QuestionTypeSelect({
  value,
  questionTypesList,
  language,
  onChange,
}: {
  value: QuestionType;
  questionTypesList: QuestionTypeOption[];
  language: string;
  onChange: (val: QuestionType) => void;
}) {
  const renderSelectedValue = React.useCallback(
    (val: string | null) => {
      const selected = questionTypesList.find((t) => t.value === val);
      if (!selected) return language === 'tr' ? 'Tür seçin' : 'Select type';
      const Icon = selected.icon;
      return (
        <span className="flex items-center gap-1.5 truncate">
          <Icon className="size-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">{selected.label}</span>
        </span>
      );
    },
    [questionTypesList, language],
  );

  const selectItems = React.useMemo(
    () =>
      questionTypesList.map((t) => {
        const Icon = t.icon;
        return (
          <SelectItem key={t.value} value={t.value}>
            <div className="flex items-center gap-2">
              <Icon className="size-3.5 text-muted-foreground" />
              <span>{t.label}</span>
            </div>
          </SelectItem>
        );
      }),
    [questionTypesList],
  );

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
          <SelectValue>{renderSelectedValue}</SelectValue>
        </SelectTrigger>
        <SelectContent>{selectItems}</SelectContent>
      </Select>
    </div>
  );
});

interface QuestionCardProps {
  fieldId: string;
  index: number;
  totalCount: number;
  isHeld: boolean;
  showDropSlotBefore: boolean;
  showDropSlotAfter: boolean;
  activeDragIndex: number | null;
  questionTypesList: QuestionTypeOption[];
  onRegisterRef: (index: number, el: HTMLDivElement | null) => void;
  onGripPointerDown: (
    e: React.PointerEvent<HTMLDivElement>,
    index: number,
  ) => void;
  onMoveQuestion: (fromIndex: number, toIndex: number) => void;
  onDuplicateQuestion: (index: number) => void;
  onDeleteQuestion: (index: number) => void;
}

const QuestionCard = React.memo(function QuestionCard({
  fieldId,
  index,
  totalCount,
  isHeld,
  showDropSlotBefore,
  showDropSlotAfter,
  activeDragIndex,
  questionTypesList,
  onRegisterRef,
  onGripPointerDown,
  onMoveQuestion,
  onDuplicateQuestion,
  onDeleteQuestion,
}: QuestionCardProps) {
  const { dict, language } = useLanguage();
  const { register, control, setValue } = useFormContext<FormBuilderValues>();

  // Watch ONLY this specific question so typing or changing another question never re-renders this card
  const currentQuestion = useWatch({
    control,
    name: `questions.${index}`,
  });

  const questionId = currentQuestion?.id || fieldId;

  // Derived boolean selector: only re-renders when THIS card's active status flips between true and false
  const isActive = useBuilderStore(
    React.useCallback(
      (s) =>
        s.isInspectorOpen &&
        (s.activeQuestionId === questionId || s.activeQuestionId === fieldId),
      [questionId, fieldId],
    ),
  );

  const isChoiceType =
    currentQuestion?.type === 'SINGLE_CHOICE' ||
    currentQuestion?.type === 'MULTIPLE_CHOICE' ||
    currentQuestion?.type === 'DROPDOWN';

  const handleCardRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      onRegisterRef(index, el);
    },
    [index, onRegisterRef],
  );

  const handleCardClick = React.useCallback(() => {
    useBuilderStore.getState().selectQuestion(questionId);
  }, [questionId]);

  const handleCardFocusCapture = React.useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      // Ignore focus events originating from Portals (e.g. SelectContent / SelectItem hover focus)
      if (!e.currentTarget.contains(e.target as Node)) return;
      useBuilderStore.getState().selectQuestion(questionId);
    },
    [questionId],
  );

  const handleTypeChange = React.useCallback(
    (typedVal: QuestionType) => {
      setValue(`questions.${index}.type`, typedVal, {
        shouldDirty: true,
      });
      if (
        ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN'].includes(typedVal) &&
        (!currentQuestion?.options || currentQuestion.options.length === 0)
      ) {
        setValue(`questions.${index}.options`, [
          {
            id: `opt_${Date.now()}_1`,
            label: language === 'tr' ? 'Seçenek 1' : 'Option 1',
          },
        ]);
      }
    },
    [index, currentQuestion?.options, language, setValue],
  );

  return (
    <>
      {/* Dynamic Drop Slot indicator (When moving UP: shows ABOVE the target card) */}
      {showDropSlotBefore && activeDragIndex !== null && (
        <div className="h-12 rounded-xl border-2 border-dashed border-primary bg-primary/10 flex items-center justify-center gap-2 text-xs font-semibold text-primary animate-pulse transition-all shadow-xs my-1 select-none">
          <ArrowUp className="size-4 animate-bounce" />
          <span>
            {language === 'tr'
              ? `Buraya Taşı (#${activeDragIndex + 1} → #${index + 1})`
              : `Drop Here (#${activeDragIndex + 1} → #${index + 1})`}
          </span>
        </div>
      )}

      <Card
        ref={handleCardRef}
        onClick={handleCardClick}
        onFocusCapture={handleCardFocusCapture}
        className={cn(
          'relative p-6 shadow-sm transition-all duration-150 cursor-pointer border bg-card overflow-visible',
          isHeld &&
            'opacity-25 border-dashed border-primary/60 scale-[0.99] bg-muted/30',
          !isHeld && isActive
            ? 'border-primary ring-2 ring-primary/20 shadow-md'
            : !isHeld && 'hover:border-border/80 hover:shadow',
        )}
      >
        {/* Top Center Drag Grip Handle (Google Forms Style) */}
        <div
          onPointerDown={(e) => onGripPointerDown(e, index)}
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex h-6 w-12 cursor-grab active:cursor-grabbing items-center justify-center rounded-md border bg-card text-muted-foreground shadow-xs hover:bg-muted hover:text-foreground hover:scale-105 active:scale-95 transition-all select-none touch-none group"
          title={
            language === 'tr'
              ? 'Soruyu taşımak için basılı tutun ve sürükleyin'
              : 'Drag to reorder question'
          }
        >
          <GripHorizontal className="size-4 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
        </div>

        {/* Question Header & Type Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
            <span className="text-xs font-semibold text-muted-foreground rounded-full size-6 flex items-center justify-center bg-muted shrink-0">
              {index + 1}
            </span>
            {currentQuestion?.config?.icon && (
              <div
                className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0"
                title={
                  language === 'tr'
                    ? `İkon: ${currentQuestion.config.icon}`
                    : `Icon: ${currentQuestion.config.icon}`
                }
              >
                <QuestionIcon
                  name={currentQuestion.config.icon}
                  className="size-4"
                />
              </div>
            )}
            <Input
              placeholder={dict.builder.canvas.questionTitlePlaceholder}
              {...register(`questions.${index}.label`)}
              className="font-medium text-base h-9 shadow-none border-transparent hover:border-input focus:border-ring bg-transparent"
            />
          </div>

          <QuestionTypeSelect
            value={currentQuestion?.type || 'SHORT_TEXT'}
            language={language}
            questionTypesList={questionTypesList}
            onChange={handleTypeChange}
          />
        </div>

        {/* Question Subtitle / Description if configured */}
        {currentQuestion?.config?.description && (
          <p className="text-xs text-muted-foreground mb-3 px-1">
            {currentQuestion.config.description}
          </p>
        )}

        {/* Field Interactive Body Preview */}
        <div className="py-2 px-1">
          {currentQuestion?.type === 'SHORT_TEXT' && (
            <Input
              disabled
              placeholder={
                currentQuestion.config?.placeholder ||
                dict.builder.canvas.shortTextPlaceholder
              }
              className="border-dashed bg-muted/20 text-xs text-muted-foreground"
            />
          )}

          {currentQuestion?.type === 'LONG_TEXT' && (
            <Textarea
              disabled
              rows={3}
              placeholder={
                currentQuestion.config?.placeholder ||
                dict.builder.canvas.longTextPlaceholder
              }
              className="border-dashed bg-muted/20 text-xs text-muted-foreground resize-none"
            />
          )}

          {isChoiceType && (
            <div className="space-y-2">
              {(currentQuestion?.options || []).map((opt, optIndex) => (
                <div
                  key={opt.id || optIndex}
                  className="flex items-center gap-2.5"
                >
                  {currentQuestion.type === 'SINGLE_CHOICE' && (
                    <div className="size-4 rounded-full border border-muted-foreground/50 shrink-0" />
                  )}
                  {currentQuestion.type === 'MULTIPLE_CHOICE' && (
                    <div className="size-4 rounded border border-muted-foreground/50 shrink-0" />
                  )}
                  {currentQuestion.type === 'DROPDOWN' && (
                    <span className="text-xs text-muted-foreground shrink-0 w-4 font-mono">
                      {optIndex + 1}.
                    </span>
                  )}

                  <Input
                    placeholder={dict.builder.canvas.optionPlaceholder.replace(
                      '{index}',
                      String(optIndex + 1),
                    )}
                    {...register(
                      `questions.${index}.options.${optIndex}.label`,
                    )}
                    className="h-8 text-xs border-transparent hover:border-input focus:border-ring"
                  />

                  {(currentQuestion.options?.length || 0) > 1 && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        const current = currentQuestion.options || [];
                        const updated = current.filter(
                          (_, i) => i !== optIndex,
                        );
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
                  const current = currentQuestion?.options || [];
                  const newOption = {
                    id: `opt_${Date.now()}_${current.length + 1}`,
                    label: dict.builder.canvas.optionPlaceholder.replace(
                      '{index}',
                      String(current.length + 1),
                    ),
                  };
                  setValue(
                    `questions.${index}.options`,
                    [...current, newOption],
                    {
                      shouldDirty: true,
                    },
                  );
                }}
                className="cursor-pointer text-xs text-primary hover:text-primary/80 gap-1.5 h-7 px-2 font-medium"
              >
                <Plus className="size-3" />
                {dict.builder.canvas.addOption}
              </Button>
            </div>
          )}

          {currentQuestion?.type === 'FILE_UPLOAD' && (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 text-center bg-muted/10">
              <Upload className="size-8 text-muted-foreground mb-2" />
              <p className="text-xs font-medium text-foreground">
                {dict.builder.canvas.fileZoneTitle}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {formatFileLimitsDescription(
                  currentQuestion.config?.maxFileSizeMb,
                  currentQuestion.config?.allowedMimeTypes,
                  language,
                )}
              </p>
            </div>
          )}
        </div>

        <Separator className="my-3" />

        {/* Card Footer: Reorder, Required Toggle, Duplicate, Delete */}
        <div
          className="flex items-center justify-between pt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={index === 0}
              onClick={() => onMoveQuestion(index, index - 1)}
              className="cursor-pointer text-muted-foreground hover:text-foreground"
              title={dict.builder.canvas.moveUp}
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={index === totalCount - 1}
              onClick={() => onMoveQuestion(index, index + 1)}
              className="cursor-pointer text-muted-foreground hover:text-foreground"
              title={dict.builder.canvas.moveDown}
            >
              <ArrowDown className="size-3.5" />
            </Button>
            <span className="text-[11px] text-muted-foreground font-mono ml-1">
              #{index + 1}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border-r pr-3">
              <span className="text-xs text-muted-foreground">
                {dict.builder.canvas.required}
              </span>
              <Switch
                checked={currentQuestion?.required || false}
                onCheckedChange={(checked) =>
                  setValue(`questions.${index}.required`, checked, {
                    shouldDirty: true,
                  })
                }
              />
            </div>

            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onDuplicateQuestion(index)}
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
            {language === 'tr'
              ? `Buraya Taşı (#${activeDragIndex + 1} → #${index + 1})`
              : `Drop Here (#${activeDragIndex + 1} → #${index + 1})`}
          </span>
        </div>
      )}
    </>
  );
});

const AddQuestionFooter = React.memo(function AddQuestionFooter({
  onAddQuestion,
}: {
  onAddQuestion: (type?: QuestionType) => void;
}) {
  const { dict } = useLanguage();
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 py-4">
      <Button
        onClick={() => onAddQuestion('SHORT_TEXT')}
        size="sm"
        className="cursor-pointer gap-2 shadow-sm font-medium w-full sm:w-auto"
      >
        <Plus className="size-4" />
        {dict.builder.canvas.addQuestion}
      </Button>

      <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs">
        <Button
          variant="outline"
          size="xs"
          onClick={() => onAddQuestion('SHORT_TEXT')}
          className="cursor-pointer"
        >
          {dict.builder.canvas.quickText}
        </Button>
        <Button
          variant="outline"
          size="xs"
          onClick={() => onAddQuestion('SINGLE_CHOICE')}
          className="cursor-pointer"
        >
          {dict.builder.canvas.quickRadio}
        </Button>
        <Button
          variant="outline"
          size="xs"
          onClick={() => onAddQuestion('MULTIPLE_CHOICE')}
          className="cursor-pointer"
        >
          {dict.builder.canvas.quickCheckbox}
        </Button>
        <Button
          variant="outline"
          size="xs"
          onClick={() => onAddQuestion('DROPDOWN')}
          className="cursor-pointer"
        >
          {dict.builder.canvas.quickDropdown}
        </Button>
        <Button
          variant="outline"
          size="xs"
          onClick={() => onAddQuestion('FILE_UPLOAD')}
          className="cursor-pointer"
        >
          {dict.builder.canvas.quickFile}
        </Button>
      </div>
    </div>
  );
});

export const BuilderCanvas = React.memo(function BuilderCanvas({
  onDuplicateQuestion,
  onDeleteQuestion,
  onAddQuestion,
}: BuilderCanvasProps) {
  const { dict, language } = useLanguage();
  const { control, getValues } = useFormContext<FormBuilderValues>();

  const { fields, move } = useFieldArray({
    control,
    name: 'questions',
  });

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const [activeDrag, setActiveDrag] = React.useState<ActiveDragState | null>(
    null,
  );

  const handleRegisterCardRef = React.useCallback(
    (index: number, el: HTMLDivElement | null) => {
      cardRefs.current[index] = el;
    },
    [],
  );

  const handleMoveQuestion = React.useCallback(
    (fromIndex: number, toIndex: number) => {
      useBuilderStore.getState().pushHistory(getValues());
      move(fromIndex, toIndex);
    },
    [getValues, move],
  );

  /**
   * Computes which question slot the user is hovering over based on clientY.
   */
  const calculateOverIndex = React.useCallback(
    (clientY: number, currentDragIndex: number) => {
      const total = fields.length;
      if (total <= 1) return 0;

      let targetIndex = currentDragIndex;

      for (let i = 0; i < total; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;

        if (i < currentDragIndex && clientY < midY) {
          return i;
        }
        if (i > currentDragIndex && clientY > midY) {
          targetIndex = i;
        }
      }

      return targetIndex;
    },
    [fields.length],
  );

  const handleGripPointerDown = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>, index: number) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const cardEl = cardRefs.current[index];
      if (!cardEl) return;

      const rect = cardEl.getBoundingClientRect();
      const q = getValues(`questions.${index}`);
      const questionId = q?.id || fields[index]?.id;

      if (questionId) {
        useBuilderStore.getState().setActiveQuestionId(questionId);
      }

      latestDragPointerYRef.current = e.clientY;
      setActiveDrag({
        index,
        pointerY: e.clientY,
        pointerX: e.clientX,
        initialPointerY: e.clientY,
        initialPointerX: e.clientX,
        cardRect: rect,
        overIndex: index,
        questionLabel:
          q?.label || (language === 'tr' ? 'Başlıksız Soru' : 'Untitled'),
        questionType: q?.type || 'SHORT_TEXT',
      });
    },
    [fields, getValues, language],
  );

  const latestDragPointerYRef = React.useRef(0);
  const isDragging = activeDrag !== null;

  React.useEffect(() => {
    if (!isDragging) return;

    let animFrameId: number | null = null;

    const handleAutoScroll = () => {
      const container = scrollContainerRef.current;
      const latestClientY = latestDragPointerYRef.current;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const edgeThreshold = 85;
        const maxScrollSpeed = 14;

        if (latestClientY < containerRect.top + edgeThreshold) {
          const intensity = Math.max(
            0.2,
            (containerRect.top + edgeThreshold - latestClientY) / edgeThreshold,
          );
          container.scrollTop -= maxScrollSpeed * intensity;
        } else if (latestClientY > containerRect.bottom - edgeThreshold) {
          const intensity = Math.max(
            0.2,
            (latestClientY - (containerRect.bottom - edgeThreshold)) /
              edgeThreshold,
          );
          container.scrollTop += maxScrollSpeed * intensity;
        }
      }
      animFrameId = requestAnimationFrame(handleAutoScroll);
    };

    animFrameId = requestAnimationFrame(handleAutoScroll);

    const handleWindowPointerMove = (e: PointerEvent) => {
      latestDragPointerYRef.current = e.clientY;
      setActiveDrag((prev) => {
        if (!prev) return null;
        const nextOver = calculateOverIndex(e.clientY, prev.index);
        return {
          ...prev,
          pointerY: e.clientY,
          pointerX: e.clientX,
          overIndex: nextOver,
        };
      });
    };

    const handleWindowPointerUp = () => {
      setActiveDrag((prev) => {
        if (prev && prev.index !== prev.overIndex) {
          useBuilderStore.getState().pushHistory(getValues());
          move(prev.index, prev.overIndex);
        }
        return null;
      });
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, [isDragging, calculateOverIndex, getValues, move]);

  const questionTypesList = React.useMemo<QuestionTypeOption[]>(
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
    [dict.builder.canvas.questionTypes],
  );

  const handleBackgroundClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        useBuilderStore.getState().deselectQuestion();
      }
    },
    [],
  );

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-8"
      onClick={handleBackgroundClick}
    >
      <div
        className="w-full max-w-3xl space-y-4 pb-20"
        style={{
          marginLeft:
            'clamp(0px, calc((100% - 48rem + var(--inspector-width, 0px)) / 2), calc(100% - 48rem))',
        }}
        onClick={handleBackgroundClick}
      >
        <FormHeaderSection />

        {/* Dynamic Questions List via useFieldArray */}
        {fields.map((field, index) => {
          const isHeld = activeDrag?.index === index;
          const isMovingUp = activeDrag
            ? activeDrag.overIndex < activeDrag.index
            : false;
          const isMovingDown = activeDrag
            ? activeDrag.overIndex > activeDrag.index
            : false;

          const showDropSlotBefore = Boolean(
            activeDrag && isMovingUp && activeDrag.overIndex === index,
          );
          const showDropSlotAfter = Boolean(
            activeDrag && isMovingDown && activeDrag.overIndex === index,
          );

          return (
            <QuestionCard
              key={field.id}
              fieldId={field.id}
              index={index}
              totalCount={fields.length}
              isHeld={isHeld}
              showDropSlotBefore={showDropSlotBefore}
              showDropSlotAfter={showDropSlotAfter}
              activeDragIndex={activeDrag ? activeDrag.index : null}
              questionTypesList={questionTypesList}
              onRegisterRef={handleRegisterCardRef}
              onGripPointerDown={handleGripPointerDown}
              onMoveQuestion={handleMoveQuestion}
              onDuplicateQuestion={onDuplicateQuestion}
              onDeleteQuestion={onDeleteQuestion}
            />
          );
        })}

        <AddQuestionFooter onAddQuestion={onAddQuestion} />
      </div>

      {/* Floating Semi-Transparent Ghost View of Held Question (Google Forms Style) */}
      {activeDrag && (
        <div
          style={{
            position: 'fixed',
            top:
              activeDrag.pointerY -
              (activeDrag.initialPointerY - activeDrag.cardRect.top),
            left: activeDrag.cardRect.left,
            width: activeDrag.cardRect.width,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          className="pointer-events-none select-none rounded-xl border-2 border-primary/80 bg-card/95 shadow-2xl p-6 opacity-85 scale-[1.01] rotate-[0.5deg] transition-transform duration-75 backdrop-blur-xs"
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 shrink-0">
                #{activeDrag.index + 1}
              </span>
              <span className="font-semibold text-base truncate text-foreground">
                {activeDrag.questionLabel || 'Başlıksız Soru'}
              </span>
            </div>
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">
              {questionTypesList.find(
                (t) => t.value === activeDrag.questionType,
              )?.label || activeDrag.questionType}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2 mt-2">
            <span className="flex items-center gap-1.5 text-primary font-medium">
              <GripHorizontal className="size-4 animate-pulse" />
              {language === 'tr' ? 'Sürükleniyor...' : 'Dragging...'}
            </span>
            <span className="text-primary font-semibold">
              {language === 'tr'
                ? `Hedef Konum: #${activeDrag.overIndex + 1}`
                : `Target Position: #${activeDrag.overIndex + 1}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});
