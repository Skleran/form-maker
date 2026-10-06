import { create } from "zustand"

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

  resetWorkspace: () => set(initialState),
}))
