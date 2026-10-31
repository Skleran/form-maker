'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFormContext, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Eye,
  Loader2,
  Menu,
  Moon,
  PanelRight,
  Redo2,
  Save,
  Share2,
  Sun,
  Undo2,
} from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBuilderStore } from '@/stores/use-builder-store';
import type { FormBuilderValues } from '@/lib/validations/form';
import { ThemeToggle } from '@/components/theme-toggle';
import { LogoutButton } from '@/components/admin/logout-button';
import { dict } from '@/lib/dictionary';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { copyText } from '@/lib/clipboard';
import { useHydrated } from '@/hooks/use-hydrated';
import { Label } from '../ui/label';

interface BuilderHeaderProps {
  formId?: string;
  submissionCount?: number;
  onSave: () => Promise<boolean>;
  onUndo: () => void;
  onRedo: () => void;
  onDiscard: () => void;
}

/**
 * Switches tab by changing only the URL: every tab's data is already in the browser,
 * so a router navigation would just wait for the server. Next keeps useSearchParams in sync.
 */
export function setBuilderTab(tab: string) {
  const params = new URLSearchParams(window.location.search);
  params.set('tab', tab);
  window.history.replaceState(null, '', `?${params.toString()}`);
}

const HeaderTitleDisplay = React.memo(function HeaderTitleDisplay() {
  const { control } = useFormContext<FormBuilderValues>();
  const title = useWatch({
    control,
    name: 'title',
    exact: true,
  });

  return (
    <span className="font-semibold text-foreground truncate max-w-[160px] sm:max-w-[260px]">
      {title || dict.builder.header.untitledForm}
    </span>
  );
});

// The slug's own subscribers: typing in the slug field must not re-render the whole header
const PreviewLink = React.memo(function PreviewLink() {
  const { control } = useFormContext<FormBuilderValues>();
  const slug = useWatch({ control, name: 'slug', exact: true });

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <a
            href={`/forms/${slug}?preview=true`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className:
                'cursor-pointer hidden sm:inline-flex items-center gap-1.5',
            })}
          >
            <Eye className="size-3.5 text-muted-foreground" />
            <span>{dict.builder.header.preview}</span>
          </a>
        }
      />
      <TooltipContent side="bottom">
        {dict.builder.header.previewTooltip}
      </TooltipContent>
    </Tooltip>
  );
});

const OpenLiveLink = React.memo(function OpenLiveLink() {
  const { control } = useFormContext<FormBuilderValues>();
  const slug = useWatch({ control, name: 'slug', exact: true });

  return (
    <a
      href={`/forms/${slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0 whitespace-nowrap px-2.5 py-1 rounded-md hover:bg-muted/50"
    >
      <span>{dict.builder.header.openLive}</span>
      <ExternalLink className="size-3.5" />
    </a>
  );
});

const InspectorToggleButton = React.memo(function InspectorToggleButton() {
  const isInspectorOpen = useBuilderStore((s) => s.isInspectorOpen);
  const toggleInspector = useBuilderStore((s) => s.toggleInspector);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={isInspectorOpen ? 'secondary' : 'ghost'}
            size="icon-sm"
            onClick={toggleInspector}
            aria-label={dict.builder.header.inspectorTooltip}
            className="cursor-pointer"
          >
            <PanelRight className="size-4" />
          </Button>
        }
      />
      <TooltipContent side="bottom">
        {dict.builder.header.inspectorTooltip}
      </TooltipContent>
    </Tooltip>
  );
});

const UndoRedoControls = React.memo(function UndoRedoControls({
  onUndo,
  onRedo,
}: {
  onUndo: () => void;
  onRedo: () => void;
}) {
  const canUndo = useBuilderStore((s) => s.canUndo);
  const canRedo = useBuilderStore((s) => s.canRedo);

  return (
    <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 shrink-0">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onUndo}
              disabled={!canUndo}
              aria-label={dict.builder.header.undoTooltip}
              className="cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-30 h-7 w-7"
            >
              <Undo2 className="size-3.5" />
            </Button>
          }
        />
        <TooltipContent side="bottom">
          {dict.builder.header.undoTooltip}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onRedo}
              disabled={!canRedo}
              aria-label={dict.builder.header.redoTooltip}
              className="cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-30 h-7 w-7"
            >
              <Redo2 className="size-3.5" />
            </Button>
          }
        />
        <TooltipContent side="bottom">
          {dict.builder.header.redoTooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
});

function SaveButtonContent({ isSaving }: { isSaving: boolean }) {
  return (
    <>
      {isSaving ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Save className="size-3.5" />
      )}
      <span>
        {isSaving ? dict.builder.header.saving : dict.builder.header.save}
      </span>
    </>
  );
}

export const BuilderHeader = React.memo(function BuilderHeader({
  submissionCount = 0,
  onSave,
  onUndo,
  onRedo,
  onDiscard,
}: BuilderHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { control, setValue, getValues } = useFormContext<FormBuilderValues>();
  const isPublished = useWatch({
    control,
    name: 'isPublished',
    exact: true,
  });

  const isSaving = useBuilderStore((s) => s.isSaving);
  const lastSavedAt = useBuilderStore((s) => s.lastSavedAt);
  const isDirty = useBuilderStore((s) => s.isDirty);
  const isBackPromptOpen = useBuilderStore((s) => s.isBackPromptOpen);
  const currentTab = searchParams.get('tab') || 'questions';

  // Unsaved changes navigation interception dialog state
  const [showUnsavedDialog, setShowUnsavedDialog] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<(() => void) | null>(
    null,
  );

  // The form stays in memory across tabs, so switching can't lose unsaved changes
  const handleTabChange = (value: string) => {
    if (value !== currentTab) setBuilderTab(value);
  };

  const handleBackClick = (e: React.MouseEvent) => {
    if (isDirty) {
      e.preventDefault();
      setPendingAction(() => () => {
        router.push('/admin/forms');
      });
      setShowUnsavedDialog(true);
    } else {
      router.push('/admin/forms');
    }
  };

  const closeUnsavedDialog = () => {
    setShowUnsavedDialog(false);
    setPendingAction(null);
    useBuilderStore.getState().setIsBackPromptOpen(false);
  };

  const leavePage = () => {
    if (isBackPromptOpen) {
      // Past the guard entry and the edit page's own entry
      window.history.go(-2);
    } else if (pendingAction) {
      pendingAction();
    } else {
      router.push('/admin/forms');
    }
    closeUnsavedDialog();
  };

  const handleConfirmDiscard = () => {
    onDiscard();
    leavePage();
  };

  const handleSaveAndProceed = async () => {
    const saved = await onSave();
    // Stay on the page after a failed save, or the unsaved changes are lost
    if (!saved) {
      closeUnsavedDialog();
      return;
    }
    leavePage();
  };

  const { setTheme, resolvedTheme } = useTheme();
  // The theme is only known in the browser, so the server renders the light icon
  const mounted = useHydrated();
  const isDark = mounted && resolvedTheme === 'dark';

  const handlePublishChange = (checked: boolean) => {
    setValue('isPublished', checked, { shouldDirty: true });
    toast.info(
      checked
        ? dict.builder.header.publishedToast
        : dict.builder.header.draftToast,
    );
  };

  const handleCopyLink = async () => {
    const publicUrl = `${window.location.origin}/forms/${getValues('slug')}`;
    if (await copyText(publicUrl)) {
      toast.success(dict.builder.header.shareToast);
    } else {
      toast.error(dict.common.copyFailed);
    }
  };

  const handleNativeShare = async () => {
    const publicUrl = `${window.location.origin}/forms/${getValues('slug')}`;
    const currentTitle = getValues('title');
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: currentTitle || 'Form',
          text:
            currentTitle ||
            'Bu formu doldurun',
          url: publicUrl,
        });
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          await handleCopyLink();
        }
      }
    } else {
      await handleCopyLink();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex flex-col border-b bg-background/95 backdrop-blur-md">
        {/* Mobile Top Bar */}
        <div className="flex md:hidden h-14 items-center justify-between px-3 gap-1.5 w-full">
          {/* Left: Back Button */}
          <button
            type="button"
            onClick={handleBackClick}
            className={buttonVariants({
              variant: 'ghost',
              size: 'icon-sm',
              className:
                'cursor-pointer text-muted-foreground hover:text-foreground h-8 w-8 shrink-0',
            })}
            title={dict.builder.header.backToForms}
          >
            <ArrowLeft className="size-4" />
          </button>

          {/* Status Indicator */}
          <div className="flex items-center shrink min-w-25.5">
            {isDirty ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0 whitespace-nowrap">
                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Kaydedilmedi</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0 whitespace-nowrap">
                <Check className="size-3 text-emerald-500" />
                <span>{dict.builder.header.saved}</span>
              </span>
            )}
          </div>

          {/* Undo / Redo */}
          <UndoRedoControls onUndo={onUndo} onRedo={onRedo} />

          {/* Save Button */}
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="cursor-pointer items-center gap-1 shadow-sm h-8 px-2.5 text-xs shrink-0"
          >
            <SaveButtonContent isSaving={isSaving} />
          </Button>

          {/* Dropdown Menu Trigger & Content */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="cursor-pointer text-muted-foreground hover:text-foreground h-8 w-8 shrink-0"
                  aria-label="Menü"
                >
                  <Menu className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent
              align="end"
              side="bottom"
              sideOffset={6}
              className="w-56 p-1.5 space-y-1 z-50 bg-popover/95 backdrop-blur-md shadow-lg border rounded-xl"
            >
              {/* Preview */}
              <DropdownMenuItem
                onClick={() => {
                  window.open(
                    `/forms/${getValues('slug')}?preview=true`,
                    '_blank',
                    'noopener,noreferrer',
                  );
                }}
                className="cursor-pointer flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Eye className="size-4 text-muted-foreground shrink-0" />
                <span>{dict.builder.header.preview}</span>
              </DropdownMenuItem>

              {/* Publish Toggle */}
              <div
                className="flex items-center rounded-lg px-2.5 py-2 text-sm font-medium hover:bg-muted/40 transition-colors"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Label
                  htmlFor="publish-toggle"
                  className="text-foreground w-full flex items-center cursor-pointer select-none"
                >
                  <span
                    className={cn(
                      'size-2 ml-1 mr-1.5 rounded-full shrink-0',
                      isPublished ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                    )}
                  />
                  {isPublished
                    ? dict.builder.header.live
                    : dict.builder.header.draft}
                </Label>
                <Switch
                  checked={isPublished}
                  id="publish-toggle"
                  onCheckedChange={handlePublishChange}
                />
              </div>

              {/* Native Share */}
              <DropdownMenuItem
                onClick={handleNativeShare}
                className="cursor-pointer flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Share2 className="size-4 text-muted-foreground shrink-0" />
                <span>{dict.builder.header.share}</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />

              {/* Side-by-side Theme & Logout */}
              <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  aria-label={`${isDark ? 'Açık' : 'Koyu'} temaya geç`}
                  className="h-8 col-span-1 w-full cursor-pointer justify-center gap-1.5 px-2 text-xs font-medium text-foreground hover:bg-accent"
                >
                  {isDark ? (
                    <>
                      <Sun className="size-3.5 text-amber-500 shrink-0" />
                    </>
                  ) : (
                    <>
                      <Moon className="size-3.5 text-slate-700 dark:text-slate-300 shrink-0" />
                    </>
                  )}
                </Button>
                <LogoutButton
                  variant="outline"
                  size="sm"
                  showText
                  className="h-8 col-span-3 justify-center text-xs font-medium text-destructive rounded-lg"
                />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop Top Bar */}
        <div className="hidden md:flex h-14 items-center justify-between px-4 sm:px-6">
          {/* Left: Back & Title & Unsaved Indicator */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleBackClick}
              className={buttonVariants({
                variant: 'ghost',
                size: 'icon-sm',
                className:
                  'cursor-pointer text-muted-foreground hover:text-foreground',
              })}
              title={dict.builder.header.backToForms}
            >
              <ArrowLeft className="size-4" />
            </button>

            <div className="flex items-center gap-2.5 truncate">
              <HeaderTitleDisplay />

              {/* Status Indicator */}
              {isDirty ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0">
                  <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {dict.builder.header.unsavedChanges}
                </span>
              ) : lastSavedAt ? (
                <span className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Check className="size-3 text-emerald-500" />
                  {dict.builder.header.saved}{' '}
                  {lastSavedAt.toLocaleTimeString(
                    'tr-TR',
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    },
                  )}
                </span>
              ) : (
                <span className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground/70 shrink-0">
                  <Check className="size-3 text-muted-foreground/50" />
                  {dict.builder.header.saved}
                </span>
              )}
            </div>
          </div>

          {/* Center: Undo / Redo */}
          <div className="flex items-center">
            <UndoRedoControls onUndo={onUndo} onRedo={onRedo} />
          </div>

          {/* Right: Actions, Publish Switch, Inspector Toggle */}
          <div className="flex items-center gap-2">
            {/* Published Toggle */}
            <div className="flex items-center gap-2 border-r pr-3 mr-1">
              <Label
                htmlFor="desktop-publish-toggle"
                className="flex items-center text-xs font-medium text-foreground select-none"
              >
                <span
                  className={cn(
                    'size-2 rounded-full shrink-0',
                    isPublished ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                  )}
                />
                {isPublished
                  ? dict.builder.header.live
                  : dict.builder.header.draft}
              </Label>
              <Switch
                checked={isPublished}
                id="desktop-publish-toggle"
                onCheckedChange={handlePublishChange}
                title={
                  isPublished
                    ? dict.builder.header.publishedToast
                    : dict.builder.header.draftToast
                }
              />
            </div>

            {/* Preview in New Tab Button */}
            <PreviewLink />

            {/* Copy Link Button */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="cursor-pointer hidden md:inline-flex items-center gap-1.5"
                  >
                    <Copy className="size-3.5 text-muted-foreground" />
                    <span>{dict.builder.header.share}</span>
                  </Button>
                }
              />
              <TooltipContent side="bottom">
                {dict.builder.header.shareTooltip}
              </TooltipContent>
            </Tooltip>

            {/* Save Button */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="sm"
                    onClick={onSave}
                    disabled={isSaving}
                    className="cursor-pointer items-center gap-1.5 shadow-sm"
                  >
                    <SaveButtonContent isSaving={isSaving} />
                  </Button>
                }
              />
              <TooltipContent side="bottom" sideOffset={8}>
                <div className="flex items-center gap-1.5 text-xs">
                  <span>{dict.builder.header.save}</span>
                  <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border">
                    Ctrl+S
                  </kbd>
                </div>
              </TooltipContent>
            </Tooltip>

            {/* Inspector Toggle */}
            <InspectorToggleButton />

            <ThemeToggle />
            <LogoutButton size="icon-sm" />
          </div>
        </div>

        {/* Tabs Navigation (URL Search Param Synced) */}
        <div className="flex items-center justify-between border-t px-4 sm:px-6 bg-muted/20">
          <Tabs
            value={currentTab}
            onValueChange={handleTabChange}
            className="w-auto"
          >
            <TabsList variant={'line'} className="h-10 space-x-6">
              <TabsTrigger
                value="questions"
                className="px-2 text-xs sm:text-sm font-medium cursor-pointer"
              >
                {dict.builder.header.tabQuestions}
              </TabsTrigger>
              <TabsTrigger
                value="responses"
                className="px-2 text-xs sm:text-sm font-medium cursor-pointer flex items-center gap-1.5"
              >
                {dict.builder.header.tabResponses}
                <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-semibold text-muted-foreground">
                  {submissionCount}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="px-2 text-xs sm:text-sm font-medium cursor-pointer"
              >
                {dict.builder.header.tabSettings}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Quick Public Form Link */}
          {isPublished && <OpenLiveLink />}
        </div>
      </header>

      {/* Unsaved Changes Confirmation Dialog */}
      <Dialog
        open={showUnsavedDialog || isBackPromptOpen}
        onOpenChange={(open) => !open && closeUnsavedDialog()}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-semibold">
              <AlertTriangle className="size-5 text-amber-500 shrink-0" />
              <span>{dict.builder.header.unsavedModalTitle}</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1.5">
              {dict.builder.header.unsavedModalDesc}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-between items-stretch sm:items-center pt-3">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDiscard}
              className="cursor-pointer shrink-0 whitespace-nowrap"
            >
              {dict.builder.header.discardAndLeave}
            </Button>
            <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={closeUnsavedDialog}
                className="cursor-pointer flex-1 whitespace-nowrap sm:flex-none"
              >
                {dict.builder.header.keepEditing}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAndProceed}
                className="cursor-pointer flex-1 whitespace-nowrap sm:flex-none"
              >
                {dict.builder.header.saveAndLeave}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
