"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";

import { cn } from "@/lib/utils";

function Drawer({ ...props }: DrawerPrimitive.Root.Props) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({ ...props }: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-overlay"
      className={cn(
        // Fades with the swipe gesture via Base UI's --drawer-swipe-progress (0 → 1)
        "fixed inset-0 z-50 bg-black/60 opacity-[calc(1-var(--drawer-swipe-progress,0))] transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
        className,
      )}
      {...props}
    />
  );
}

function DrawerSwipeHandle({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-swipe-handle"
      aria-hidden="true"
      className={cn(
        "mx-auto my-2.5 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30 cursor-grab active:cursor-grabbing",
        className,
      )}
      {...props}
    />
  );
}

function DrawerContent({
  className,
  children,
  showSwipeHandle = true,
  ...props
}: DrawerPrimitive.Popup.Props & {
  showSwipeHandle?: boolean;
}) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      {/* Keeps focused inputs visible above the iOS/Android software keyboard */}
      <DrawerPrimitive.VirtualKeyboardProvider>
        <DrawerPrimitive.Viewport className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none p-2 pt-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <DrawerPrimitive.Popup
            data-slot="drawer-content"
            className={cn(
              "group/drawer-popup pointer-events-auto relative flex max-h-[88dvh] w-full flex-col rounded-2xl border bg-background shadow-2xl outline-none overflow-hidden",
              // Enter / exit slide
              "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-starting-style:translate-y-full data-ending-style:translate-y-full",
              // Follow the finger 1:1 while swiping, release faster on a strong flick
              "data-swiping:duration-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*300ms)]",
              className,
            )}
            {...props}
          >
            {showSwipeHandle && <DrawerSwipeHandle />}
            {children}
          </DrawerPrimitive.Popup>
        </DrawerPrimitive.Viewport>
      </DrawerPrimitive.VirtualKeyboardProvider>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex flex-col gap-1.5 p-4 text-center sm:text-left shrink-0",
        className,
      )}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4 shrink-0", className)}
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn(
        "text-base font-semibold leading-none tracking-tight text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerSwipeHandle,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
