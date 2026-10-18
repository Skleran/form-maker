import { create } from "zustand"
import type { FormBuilderValues } from "@/lib/validations/form"
import type { SlugConflictInfo } from "@/actions/form-actions"

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

  // URL slug collision state for inline settings feedback
  slugConflict: SlugConflictInfo | null

  // Undo / Redo history state
  past: FormBuilderValues[]
  future: FormBuilderValues[]
  canUndo: boolean
  canRedo: boolean

  // Session uploaded files (for reconciliation and cleanup on save / discard)
  sessionUploadedFiles: string[]
}

export interface BuilderActions {
  setActiveQuestionId: (id: string | null) => void
  selectQuestion: (id: string) => void
  deselectQuestion: () => void
  setPreviewDevice: (device: PreviewDevice) => void
  setIsInspectorOpen: (isOpen: boolean) => void
  toggleInspector: () => void
  setIsLivePreview: (isLive: boolean) => void
  toggleLivePreview: () => void
  setIsSaving: (isSaving: boolean) => void
  setLastSavedAt: (date: Date | null) => void
  setIsDirty: (isDirty: boolean) => void
  setSlugConflict: (conflict: SlugConflictInfo | null) => void
  pushHistory: (currentState: FormBuilderValues) => void
  undo: (currentState: FormBuilderValues) => FormBuilderValues | null
  redo: (currentState: FormBuilderValues) => FormBuilderValues | null
  clearHistory: () => void
  addSessionUploadedFile: (url: string) => void
  clearSessionUploadedFiles: () => void
  resetWorkspace: () => void
}

export type BuilderStore = BuilderState & BuilderActions

const initialState: BuilderState = {
  activeQuestionId: null,
  previewDevice: "desktop",
  isInspectorOpen: false,
  isLivePreview: false,
  isSaving: false,
  lastSavedAt: null,
  isDirty: false,
  slugConflict: null,
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,
  sessionUploadedFiles: [],
}

export const useBuilderStore = create<BuilderStore>((set) => ({
  ...initialState,

  setActiveQuestionId: (id) =>
    set((state) => (state.activeQuestionId === id ? state : { activeQuestionId: id })),

  selectQuestion: (id) =>
    set((state) => {
      if (state.activeQuestionId === id && state.isInspectorOpen) {
        return state
      }
      return {
        activeQuestionId: id,
        isInspectorOpen: true,
      }
    }),

  deselectQuestion: () =>
    set((state) => {
      if (state.activeQuestionId === null && !state.isInspectorOpen) {
        return state
      }
      return {
        activeQuestionId: null,
        isInspectorOpen: false,
      }
    }),

  setPreviewDevice: (device) =>
    set((state) => (state.previewDevice === device ? state : { previewDevice: device })),

  setIsInspectorOpen: (isOpen) =>
    set((state) => {
      const nextActiveId = isOpen ? state.activeQuestionId : null
      if (state.isInspectorOpen === isOpen && state.activeQuestionId === nextActiveId) {
        return state
      }
      return {
        isInspectorOpen: isOpen,
        activeQuestionId: nextActiveId,
      }
    }),

  toggleInspector: () =>
    set((state) => {
      const nextOpen = !state.isInspectorOpen
      return {
        isInspectorOpen: nextOpen,
        activeQuestionId: nextOpen ? state.activeQuestionId : null,
      }
    }),

  setIsLivePreview: (isLive) =>
    set((state) => (state.isLivePreview === isLive ? state : { isLivePreview: isLive })),

  toggleLivePreview: () => set((state) => ({ isLivePreview: !state.isLivePreview })),

  setIsSaving: (isSaving) =>
    set((state) => (state.isSaving === isSaving ? state : { isSaving })),

  setLastSavedAt: (date) =>
    set((state) => (state.lastSavedAt === date ? state : { lastSavedAt: date })),

  setIsDirty: (isDirty) =>
    set((state) => (state.isDirty === isDirty ? state : { isDirty })),

  setSlugConflict: (conflict) =>
    set((state) => {
      if (
        state.slugConflict?.conflictingFormId === conflict?.conflictingFormId &&
        state.slugConflict?.slug === conflict?.slug
      ) {
        return state
      }
      return { slugConflict: conflict }
    }),

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
    set((state) => {
      if (
        state.past.length === 0 &&
        state.future.length === 0 &&
        !state.canUndo &&
        !state.canRedo
      ) {
        return state
      }
      return {
        past: [],
        future: [],
        canUndo: false,
        canRedo: false,
      }
    }),

  addSessionUploadedFile: (url) =>
    set((state) => {
      if (!url || state.sessionUploadedFiles.includes(url)) {
        return state
      }
      return {
        sessionUploadedFiles: [...state.sessionUploadedFiles, url],
      }
    }),

  clearSessionUploadedFiles: () =>
    set((state) => {
      if (state.sessionUploadedFiles.length === 0) return state
      return { sessionUploadedFiles: [] }
    }),

  resetWorkspace: () => set(initialState),
}))
