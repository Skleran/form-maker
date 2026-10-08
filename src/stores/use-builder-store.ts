import { create } from "zustand"
import type { FormBuilderValues } from "@/lib/validations/form"

export type PreviewDevice = "desktop" | "tablet" | "mobile"

export interface BuilderState {
  // Active selected question for inspector panel
  activeQuestionId: string | null

  // Device preview simulation mode
  previewDevice: PreviewDevice

  // Inspector sidebar drawer/sheet open state
  isInspectorOpen: boolean

  // Live preview interactive modal/view toggle
  isLivePreview: boolean

  // Transient save/sync status
  isSaving: boolean
  lastSavedAt: Date | null
  isDirty: boolean

  // Undo / Redo history state
  past: FormBuilderValues[]
  future: FormBuilderValues[]
  canUndo: boolean
  canRedo: boolean
}

export interface BuilderActions {
  setActiveQuestionId: (id: string | null) => void
  setPreviewDevice: (device: PreviewDevice) => void
  setIsInspectorOpen: (isOpen: boolean) => void
  toggleInspector: () => void
  setIsLivePreview: (isLive: boolean) => void
  toggleLivePreview: () => void
  setIsSaving: (isSaving: boolean) => void
  setLastSavedAt: (date: Date | null) => void
  setIsDirty: (isDirty: boolean) => void
  pushHistory: (currentState: FormBuilderValues) => void
  undo: (currentState: FormBuilderValues) => FormBuilderValues | null
  redo: (currentState: FormBuilderValues) => FormBuilderValues | null
  clearHistory: () => void
  resetWorkspace: () => void
}

export type BuilderStore = BuilderState & BuilderActions

const initialState: BuilderState = {
  activeQuestionId: null,
  previewDevice: "desktop",
  isInspectorOpen: true,
  isLivePreview: false,
  isSaving: false,
  lastSavedAt: null,
  isDirty: false,
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,
}

export const useBuilderStore = create<BuilderStore>((set) => ({
  ...initialState,

  setActiveQuestionId: (id) =>
    set((state) => ({
      activeQuestionId: id,
      // Automatically open inspector if a question is selected
      isInspectorOpen: id !== null ? true : state.isInspectorOpen,
    })),

  setPreviewDevice: (device) => set({ previewDevice: device }),

  setIsInspectorOpen: (isOpen) => set({ isInspectorOpen: isOpen }),

  toggleInspector: () => set((state) => ({ isInspectorOpen: !state.isInspectorOpen })),

  setIsLivePreview: (isLive) => set({ isLivePreview: isLive }),

  toggleLivePreview: () => set((state) => ({ isLivePreview: !state.isLivePreview })),

  setIsSaving: (isSaving) => set({ isSaving }),

  setLastSavedAt: (date) => set({ lastSavedAt: date }),

  setIsDirty: (isDirty) => set({ isDirty }),

  pushHistory: (currentState) =>
    set((state) => {
      // Avoid duplicate states
      const last = state.past[state.past.length - 1]
      if (last && JSON.stringify(last) === JSON.stringify(currentState)) {
        return state
      }
      const newPast = [...state.past, currentState].slice(-30)
      return {
        past: newPast,
        future: [],
        canUndo: newPast.length > 0,
        canRedo: false,
      }
    }),

  undo: (currentState) => {
    let restored: FormBuilderValues | null = null
    set((state) => {
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]
      const newPast = state.past.slice(0, state.past.length - 1)
      const newFuture = [currentState, ...state.future].slice(0, 30)
      restored = previous
      return {
        past: newPast,
        future: newFuture,
        canUndo: newPast.length > 0,
        canRedo: newFuture.length > 0,
      }
    })
    return restored
  },

  redo: (currentState) => {
    let restored: FormBuilderValues | null = null
    set((state) => {
      if (state.future.length === 0) return state
      const next = state.future[0]
      const newFuture = state.future.slice(1)
      const newPast = [...state.past, currentState].slice(-30)
      restored = next
      return {
        past: newPast,
        future: newFuture,
        canUndo: newPast.length > 0,
        canRedo: newFuture.length > 0,
      }
    })
    return restored
  },

  clearHistory: () =>
    set({
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
    }),

  resetWorkspace: () => set(initialState),
}))
