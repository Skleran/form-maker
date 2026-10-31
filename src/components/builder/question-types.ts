import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  AlignLeft,
  CheckSquare,
  ChevronDown,
  FileUp,
  Radio,
  Type,
} from 'lucide-react';

import { dict } from '@/lib/dictionary';
import type { FormBuilderValues } from '@/lib/validations/form';
import type { QuestionType } from '@/types/form';

const typeLabels = dict.builder.canvas.questionTypes;

export const QUESTION_TYPES: ReadonlyArray<{
  value: QuestionType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'SHORT_TEXT', label: typeLabels.SHORT_TEXT, icon: Type },
  { value: 'LONG_TEXT', label: typeLabels.LONG_TEXT, icon: AlignLeft },
  { value: 'SINGLE_CHOICE', label: typeLabels.SINGLE_CHOICE, icon: Radio },
  { value: 'MULTIPLE_CHOICE', label: typeLabels.MULTIPLE_CHOICE, icon: CheckSquare },
  { value: 'DROPDOWN', label: typeLabels.DROPDOWN, icon: ChevronDown },
  { value: 'FILE_UPLOAD', label: typeLabels.FILE_UPLOAD, icon: FileUp },
];

/**
 * Changes a question's type, giving a choice question its first option if it has none.
 */
export function useChangeQuestionType(index: number) {
  const { getValues, setValue } = useFormContext<FormBuilderValues>();

  return React.useCallback(
    (type: QuestionType) => {
      setValue(`questions.${index}.type`, type, { shouldDirty: true });
      const currentOptions = getValues(`questions.${index}.options`);
      if (
        ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN'].includes(type) &&
        (!currentOptions || currentOptions.length === 0)
      ) {
        setValue(`questions.${index}.options`, [
          { id: `opt_${Date.now()}_1`, label: 'Seçenek 1' },
        ]);
      }
    },
    [index, getValues, setValue],
  );
}
