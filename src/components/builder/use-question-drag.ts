import * as React from 'react';
import type { UseFormGetValues } from 'react-hook-form';

import { isMobileViewport } from '@/hooks/use-mobile';
import type { FormBuilderValues } from '@/lib/validations/form';
import { useBuilderStore } from '@/stores/use-builder-store';
import type { QuestionType } from '@/types/form';

export interface ActiveDragState {
  index: number;
  initialPointerY: number;
  cardRect: DOMRect;
  overIndex: number;
  questionLabel: string;
  questionType: QuestionType;
}

/**
 * Drag-to-reorder for question cards, with auto-scroll near the edges of the canvas.
 */
export function useQuestionDrag({
  questionCount,
  getValues,
  move,
}: {
  questionCount: number;
  getValues: UseFormGetValues<FormBuilderValues>;
  move: (from: number, to: number) => void;
}) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const ghostRef = React.useRef<HTMLDivElement>(null);
  const activeDragRef = React.useRef<ActiveDragState | null>(null);
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
      const total = questionCount;
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
    [questionCount],
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
      const questionId = q?.id;

      if (questionId) {
        useBuilderStore.getState().setActiveQuestionId(questionId);
      }

      latestDragPointerYRef.current = e.clientY;
      const initialDragState: ActiveDragState = {
        index,
        initialPointerY: e.clientY,
        cardRect: rect,
        overIndex: index,
        questionLabel:
          q?.label || 'Başlıksız Soru',
        questionType: q?.type || 'SHORT_TEXT',
      };
      activeDragRef.current = initialDragState;
      setActiveDrag(initialDragState);
    },
    [getValues],
  );

  const latestDragPointerYRef = React.useRef(0);
  const isDragging = activeDrag !== null;

  React.useEffect(() => {
    if (!isDragging) return;

    let animFrameId: number | null = null;

    // State changes only when the drop position does, so moving the pointer doesn't re-render the canvas
    const updateOverIndex = (clientY: number) => {
      const currentDrag = activeDragRef.current;
      if (!currentDrag) return;
      const nextOver = calculateOverIndex(clientY, currentDrag.index);
      if (nextOver === currentDrag.overIndex) return;
      const nextState: ActiveDragState = { ...currentDrag, overIndex: nextOver };
      activeDragRef.current = nextState;
      setActiveDrag(nextState);
    };

    const handleAutoScroll = () => {
      const container = scrollContainerRef.current;
      const latestClientY = latestDragPointerYRef.current;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const isMobile = isMobileViewport();

        // Calculate against the actual visible viewport bounds (avoids off-screen bottom on mobile)
        const viewportBottom =
          typeof window !== 'undefined'
            ? window.innerHeight
            : containerRect.bottom;
        const effectiveBottom = Math.min(containerRect.bottom, viewportBottom);
        const effectiveTop = Math.max(containerRect.top, 0);

        // On mobile, give a generous bottom zone (170px) so scrolling starts comfortably
        // well before the user reaches the physical bottom edge / system gesture bar
        const edgeThresholdTop = isMobile ? 110 : 85;
        const edgeThresholdBottom = isMobile ? 170 : 90;
        const maxScrollSpeed = isMobile ? 18 : 14;

        let didScroll = false;

        if (latestClientY < effectiveTop + edgeThresholdTop) {
          const intensity = Math.max(
            0.2,
            Math.min(
              2.5,
              (effectiveTop + edgeThresholdTop - latestClientY) /
                edgeThresholdTop,
            ),
          );
          container.scrollTop -= maxScrollSpeed * intensity;
          didScroll = true;
        } else if (latestClientY > effectiveBottom - edgeThresholdBottom) {
          const intensity = Math.max(
            0.2,
            Math.min(
              2.5,
              (latestClientY - (effectiveBottom - edgeThresholdBottom)) /
                edgeThresholdBottom,
            ),
          );
          container.scrollTop += maxScrollSpeed * intensity;
          didScroll = true;
        }

        // As elements scroll under the user's stationary finger, keep the drop slot updated in real time
        if (didScroll) {
          updateOverIndex(latestClientY);
        }
      }
      animFrameId = requestAnimationFrame(handleAutoScroll);
    };

    animFrameId = requestAnimationFrame(handleAutoScroll);

    const handleWindowPointerMove = (e: PointerEvent) => {
      latestDragPointerYRef.current = e.clientY;
      const currentDrag = activeDragRef.current;
      if (currentDrag && ghostRef.current) {
        ghostRef.current.style.transform = `translateY(${e.clientY - currentDrag.initialPointerY}px)`;
      }
      updateOverIndex(e.clientY);
    };

    const handleWindowPointerUp = () => {
      const finishedDrag = activeDragRef.current;
      activeDragRef.current = null;
      setActiveDrag(null);

      if (finishedDrag && finishedDrag.index !== finishedDrag.overIndex) {
        useBuilderStore.getState().pushHistory(getValues());
        move(finishedDrag.index, finishedDrag.overIndex);
      }
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

  return {
    scrollContainerRef,
    ghostRef,
    activeDrag,
    handleRegisterCardRef,
    handleMoveQuestion,
    handleGripPointerDown,
  };
}
