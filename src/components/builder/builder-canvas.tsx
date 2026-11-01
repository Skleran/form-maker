'use client';

import * as React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { GripHorizontal, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useBuilderStore } from '@/stores/use-builder-store';
import type { FormBuilderValues } from '@/lib/validations/form';
import type { QuestionType } from '@/types/form';
import { dict } from '@/lib/dictionary';
import { FormHeaderSection } from './form-header-section';
import { QuestionCard } from './question-card';
import { QUESTION_TYPES } from './question-types';
import { useQuestionDrag } from './use-question-drag';

interface BuilderCanvasProps {
  onDuplicateQuestion: (index: number) => void;
  onDeleteQuestion: (index: number) => void;
  onAddQuestion: (type?: QuestionType) => void;
}

const AddQuestionFooter = React.memo(function AddQuestionFooter({
  onAddQuestion,
}: {
  onAddQuestion: (type?: QuestionType) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 py-4">
      <Button
        onClick={() => onAddQuestion('SHORT_TEXT')}
        size="sm"
        className="cursor-pointer gap-2 font-medium w-full sm:w-auto"
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

/**
 * Slides the canvas horizontally using a GPU-composited transform (via data-inspector-open)
 * instead of animating margin-left/max-width (which caused 60fps layout reflows across all question cards).
 */
const CanvasSlideContainer = React.memo(function CanvasSlideContainer({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const isOpen = useBuilderStore((s) =>
    Boolean(s.isInspectorOpen && s.activeQuestionId),
  );

  return (
    <div
      data-canvas-slide
      data-inspector-open={isOpen ? '' : undefined}
      className="mx-auto w-full max-w-3xl space-y-4 pb-20 transition-transform duration-450 ease-[cubic-bezier(0.22,1,0.36,1)]"
      onClick={onClick}
    >
      {children}
    </div>
  );
});

export const BuilderCanvas = React.memo(function BuilderCanvas({
  onDuplicateQuestion,
  onDeleteQuestion,
  onAddQuestion,
}: BuilderCanvasProps) {
  const { control, getValues } = useFormContext<FormBuilderValues>();

  // Use keyName: "_rhfId" so field.id preserves the persistent question.id (q_...)
  // instead of being overwritten by regenerated RHF UUIDs on setValue/reset.
  const { fields, move } = useFieldArray({
    control,
    name: 'questions',
    keyName: '_rhfId',
  });

  const {
    scrollContainerRef,
    ghostRef,
    activeDrag,
    handleRegisterCardRef,
    handleMoveQuestion,
    handleGripPointerDown,
  } = useQuestionDrag({ questionCount: fields.length, getValues, move });

  const handleBackgroundClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        useBuilderStore.getState().deselectQuestion();
      }
    },
    [],
  );

  const totalCount = fields.length;

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto bg-background p-4 md:p-8"
      onClick={handleBackgroundClick}
    >
      <CanvasSlideContainer onClick={handleBackgroundClick}>
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
          const persistentId = field.id || field._rhfId;

          return (
            <QuestionCard
              key={persistentId}
              fieldId={persistentId}
              index={index}
              isLast={index === totalCount - 1}
              isHeld={isHeld}
              showDropSlotBefore={showDropSlotBefore}
              showDropSlotAfter={showDropSlotAfter}
              activeDragIndex={
                showDropSlotBefore || showDropSlotAfter
                  ? activeDrag!.index
                  : null
              }
              onRegisterRef={handleRegisterCardRef}
              onGripPointerDown={handleGripPointerDown}
              onMoveQuestion={handleMoveQuestion}
              onDuplicateQuestion={onDuplicateQuestion}
              onDeleteQuestion={onDeleteQuestion}
            />
          );
        })}

        <AddQuestionFooter onAddQuestion={onAddQuestion} />
      </CanvasSlideContainer>

      {/* Floating Semi-Transparent Ghost View of Held Question (Google Forms Style) */}
      {activeDrag && (
        <div
          ref={ghostRef}
          style={{
            position: 'fixed',
            top: activeDrag.cardRect.top,
            left: activeDrag.cardRect.left,
            width: activeDrag.cardRect.width,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          className="pointer-events-none select-none rounded-xl border border-foreground/60 bg-card p-5 shadow-lg"
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-mono text-xs tabular-nums text-muted-foreground shrink-0">
                {String(activeDrag.index + 1).padStart(2, '0')}
              </span>
              <span className="font-medium truncate text-foreground">
                {activeDrag.questionLabel || 'Başlıksız Soru'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {QUESTION_TYPES.find(
                (t) => t.value === activeDrag.questionType,
              )?.label || activeDrag.questionType}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2 mt-2">
            <span className="flex items-center gap-1.5">
              <GripHorizontal aria-hidden="true" className="size-4" />
              Sürükleniyor…
            </span>
            <span className="tabular-nums text-foreground">
              {`Hedef Konum: #${activeDrag.overIndex + 1}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});
