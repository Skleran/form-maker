"use client"

import * as React from "react"
import { LogOut, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { logoutAdmin } from "@/actions/auth-actions"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface LogoutButtonProps {
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "icon-sm" | "icon-xs"
  showText?: boolean
  className?: string
}

export function LogoutButton({
  variant = "ghost",
  size = "sm",
  showText = false,
  className = "",
}: LogoutButtonProps) {
  const [isPending, startTransition] = React.useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAdmin()
    })
  }

  const content = (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      disabled={isPending}
      className={`cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ${className}`}
      title="Çıkış Yap"
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin text-destructive" />
      ) : (
        <LogOut className="size-4" />
      )}
      {showText && <span className="ml-1.5 text-xs font-medium">Çıkış Yap</span>}
    </Button>
  )

  if (showText) {
    return content
  }

  return (
    <Tooltip>
      <TooltipTrigger render={content} />
      <TooltipContent>Çıkış Yap</TooltipContent>
    </Tooltip>
  )
}
