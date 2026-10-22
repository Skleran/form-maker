"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Check, Loader2, RotateCcw, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"

export interface CropBox {
  x: number
  y: number
  width: number
  height: number
}

export interface HeaderCropResult {
  headerImage: string
  headerImageRaw: string
  headerImageCrop: CropBox
}

interface HeaderImageCropModalProps {
  isOpen: boolean
  imageSrc: string
  rawFile?: File | null
  existingRawUrl?: string | null
  initialCrop?: CropBox | null
  onClose: () => void
  onSave: (result: HeaderCropResult) => void
}

const BANNER_ASPECT_RATIO = 4 // 4:1 width to height banner (e.g. 1200x300)

export function HeaderImageCropModal({
  isOpen,
  imageSrc,
  rawFile,
  existingRawUrl,
  initialCrop,
  onClose,
  onSave,
}: HeaderImageCropModalProps) {
  const { language } = useLanguage()
  const imageRef = React.useRef<HTMLImageElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const [imageLoaded, setImageLoaded] = React.useState(false)
  const [imageError, setImageError] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [displaySize, setDisplaySize] = React.useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  })
  const [crop, setCrop] = React.useState<CropBox>({ x: 0, y: 0, width: 0, height: 0 })

  // Dragging state
  const dragRef = React.useRef<{
    mode: "move" | "tl" | "tr" | "bl" | "br" | null
    startX: number
    startY: number
    startCrop: CropBox
  }>({
    mode: null,
    startX: 0,
    startY: 0,
    startCrop: { x: 0, y: 0, width: 0, height: 0 },
  })

  const getDefaultCrop = React.useCallback(
    (dispW: number, dispH: number): CropBox => {
      let cropW = dispW * 0.96
      let cropH = cropW / BANNER_ASPECT_RATIO

      if (cropH > dispH) {
        cropH = dispH * 0.96
        cropW = cropH * BANNER_ASPECT_RATIO
      }

      const x = Math.max(0, (dispW - cropW) / 2)
      const y = Math.max(0, (dispH - cropH) / 2)

      return { x, y, width: cropW, height: cropH }
    },
    []
  )

  const applyCrop = React.useCallback(
    (dispW: number, dispH: number) => {
      if (
        initialCrop &&
        typeof initialCrop.x === "number" &&
        typeof initialCrop.y === "number" &&
        typeof initialCrop.width === "number" &&
        typeof initialCrop.height === "number" &&
        initialCrop.width > 0 &&
        initialCrop.height > 0
      ) {
        let cropW = initialCrop.width * dispW
        let cropH = initialCrop.height * dispH
        let cropX = initialCrop.x * dispW
        let cropY = initialCrop.y * dispH

        cropW = Math.min(cropW, dispW)
        cropH = Math.min(cropH, dispH)
        cropX = Math.max(0, Math.min(dispW - cropW, cropX))
        cropY = Math.max(0, Math.min(dispH - cropH, cropY))

        setCrop({ x: cropX, y: cropY, width: cropW, height: cropH })
        return
      }

      setCrop(getDefaultCrop(dispW, dispH))
    },
    [initialCrop, getDefaultCrop]
  )

  const handleImageLoad = () => {
    if (!imageRef.current) return
    const rect = imageRef.current.getBoundingClientRect()
    setDisplaySize({ width: rect.width, height: rect.height })
    applyCrop(rect.width, rect.height)
    setImageLoaded(true)
  }

  // Update display dimensions on window resize proportionally
  React.useEffect(() => {
    if (!isOpen || !imageLoaded) return

    const handleResize = () => {
      if (imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          setDisplaySize((prev) => {
            if (prev.width > 0 && prev.height > 0) {
              const ratioX = rect.width / prev.width
              const ratioY = rect.height / prev.height
              setCrop((c) => ({
                x: c.x * ratioX,
                y: c.y * ratioY,
                width: c.width * ratioX,
                height: c.height * ratioY,
              }))
            }
            return { width: rect.width, height: rect.height }
          })
        }
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [isOpen, imageLoaded])

  // Mouse / Pointer events for dragging and resizing
  const startDrag = (
    e: React.PointerEvent,
    mode: "move" | "tl" | "tr" | "bl" | "br"
  ) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.mode) return

    const { mode, startX, startY, startCrop } = dragRef.current
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    const { width: dispW, height: dispH } = displaySize

    if (mode === "move") {
      const maxX = dispW - startCrop.width
      const maxY = dispH - startCrop.height
      const nextX = Math.min(Math.max(0, startCrop.x + dx), maxX)
      const nextY = Math.min(Math.max(0, startCrop.y + dy), maxY)

      setCrop((prev) => ({ ...prev, x: nextX, y: nextY }))
      return
    }

    // Corner resizes maintaining 4:1 aspect ratio
    let newWidth = startCrop.width
    let newHeight = startCrop.height
    let newX = startCrop.x
    let newY = startCrop.y

    if (mode === "br") {
      newWidth = Math.max(120, Math.min(dispW - startCrop.x, startCrop.width + dx))
      newHeight = newWidth / BANNER_ASPECT_RATIO
      if (startCrop.y + newHeight > dispH) {
        newHeight = dispH - startCrop.y
        newWidth = newHeight * BANNER_ASPECT_RATIO
      }
    } else if (mode === "bl") {
      newWidth = Math.max(120, Math.min(startCrop.x + startCrop.width, startCrop.width - dx))
      newHeight = newWidth / BANNER_ASPECT_RATIO
      if (startCrop.y + newHeight > dispH) {
        newHeight = dispH - startCrop.y
        newWidth = newHeight * BANNER_ASPECT_RATIO
      }
      newX = startCrop.x + (startCrop.width - newWidth)
    } else if (mode === "tr") {
      newWidth = Math.max(120, Math.min(dispW - startCrop.x, startCrop.width + dx))
      newHeight = newWidth / BANNER_ASPECT_RATIO
      if (startCrop.y + startCrop.height - newHeight < 0) {
        newHeight = startCrop.y + startCrop.height
        newWidth = newHeight * BANNER_ASPECT_RATIO
      }
      newY = startCrop.y + (startCrop.height - newHeight)
    } else if (mode === "tl") {
      newWidth = Math.max(120, Math.min(startCrop.x + startCrop.width, startCrop.width - dx))
      newHeight = newWidth / BANNER_ASPECT_RATIO
      if (startCrop.y + startCrop.height - newHeight < 0) {
        newHeight = startCrop.y + startCrop.height
        newWidth = newHeight * BANNER_ASPECT_RATIO
      }
      newX = startCrop.x + (startCrop.width - newWidth)
      newY = startCrop.y + (startCrop.height - newHeight)
    }

    setCrop({
      x: Math.max(0, Math.min(dispW - newWidth, newX)),
      y: Math.max(0, Math.min(dispH - newHeight, newY)),
      width: newWidth,
      height: newHeight,
    })
  }

  const endDrag = (e: React.PointerEvent) => {
    if (dragRef.current.mode) {
      dragRef.current.mode = null
      try {
        ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {
        // Pointer capture may have already been released
      }
    }
  }

  const handleSaveCrop = async () => {
    const img = imageRef.current
    if (!img || !imageLoaded || displaySize.width === 0 || displaySize.height === 0 || isUploading) return

    const canvas = document.createElement("canvas")
    const targetWidth = 1200
    const targetHeight = 300 // 4:1
    canvas.width = targetWidth
    canvas.height = targetHeight

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const scaleX = img.naturalWidth / displaySize.width
    const scaleY = img.naturalHeight / displaySize.height

    const sx = Math.max(0, Math.min(img.naturalWidth - 1, crop.x * scaleX))
    const sy = Math.max(0, Math.min(img.naturalHeight - 1, crop.y * scaleY))
    const sWidth = Math.min(img.naturalWidth - sx, crop.width * scaleX)
    const sHeight = Math.min(img.naturalHeight - sy, crop.height * scaleY)

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight)

    const normalizedCrop: CropBox = {
      x: crop.x / displaySize.width,
      y: crop.y / displaySize.height,
      width: crop.width / displaySize.width,
      height: crop.height / displaySize.height,
    }

    setIsUploading(true)

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
      })

      if (!blob) {
        throw new Error("Canvas crop generation failed")
      }

      // 1. Upload cropped banner blob
      const cropFormData = new FormData()
      cropFormData.append("file", blob, "header-banner.jpg")
      cropFormData.append("folder", "headers")

      const cropUploadPromise = fetch("/api/upload", {
        method: "POST",
        body: cropFormData,
      }).then(async (res) => {
        const json = await res.json()
        if (!res.ok || !json.success || !json.data?.url) {
          throw new Error(json.error || "Cropped banner upload failed")
        }
        return json.data.url as string
      })

      // 2. If a new raw file was provided (brand new image selection), upload it in parallel
      let rawUploadPromise: Promise<string>
      if (rawFile) {
        const rawFormData = new FormData()
        rawFormData.append("file", rawFile)
        rawFormData.append("folder", "headers")
        rawUploadPromise = fetch("/api/upload", {
          method: "POST",
          body: rawFormData,
        }).then(async (res) => {
          const json = await res.json()
          if (!res.ok || !json.success || !json.data?.url) {
            throw new Error(json.error || "Raw image upload failed")
          }
          return json.data.url as string
        })
      } else {
        // Re-cropping existing image; preserve existing raw URL
        rawUploadPromise = Promise.resolve(existingRawUrl || imageSrc)
      }

      const [uploadedCroppedUrl, uploadedRawUrl] = await Promise.all([
        cropUploadPromise,
        rawUploadPromise,
      ])

      onSave({
        headerImage: uploadedCroppedUrl,
        headerImageRaw: uploadedRawUrl,
        headerImageCrop: normalizedCrop,
      })
      onClose()
    } catch (err) {
      console.error("Failed to upload header images:", err)
      toast.error(
        language === "tr"
          ? "Kapak görseli yüklenirken hata oluştu. Lütfen tekrar deneyin."
          : "Failed to upload cover image. Please try again."
      )
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen || typeof document === "undefined") return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in-0 duration-150">
      <div className="relative flex flex-col w-full max-w-3xl rounded-xl bg-card border shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/20 shrink-0">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {language === "tr" ? "Kapak Görseli Konumu" : "Cover Image Position"}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            className="cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Crop Canvas Workspace */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/40 min-h-[340px]">
          <div
            ref={containerRef}
            className="relative select-none inline-block shadow-md border rounded overflow-hidden touch-none"
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
          >
            {/* Base Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={imageSrc}
              crossOrigin={
                imageSrc.startsWith("blob:") || imageSrc.startsWith("data:")
                  ? undefined
                  : "anonymous"
              }
              alt={language === "tr" ? "Kırpılacak Görsel" : "Image to Crop"}
              onLoad={handleImageLoad}
              onError={() => setImageError(true)}
              className="max-h-[55vh] max-w-full w-auto h-auto block select-none pointer-events-none"
              draggable={false}
            />

            {imageError && (
              <div className="p-8 text-center bg-card/90 flex flex-col items-center justify-center gap-2 min-h-[200px]">
                <p className="text-sm font-medium text-destructive">
                  {language === "tr"
                    ? "Görsel yüklenemedi. Lütfen 'Görseli Değiştir' ile tekrar yükleyin."
                    : "Image could not be loaded. Please re-upload using 'Change Image'."}
                </p>
              </div>
            )}

            {/* Dark Mask Overlays Outside Crop Box */}
            {imageLoaded && (
              <>
                {/* Top mask */}
                <div
                  style={{ top: 0, left: 0, right: 0, height: crop.y }}
                  className="absolute bg-black/55 pointer-events-none transition-none"
                />
                {/* Bottom mask */}
                <div
                  style={{
                    top: crop.y + crop.height,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  }}
                  className="absolute bg-black/55 pointer-events-none transition-none"
                />
                {/* Left mask */}
                <div
                  style={{
                    top: crop.y,
                    left: 0,
                    width: crop.x,
                    height: crop.height,
                  }}
                  className="absolute bg-black/55 pointer-events-none transition-none"
                />
                {/* Right mask */}
                <div
                  style={{
                    top: crop.y,
                    left: crop.x + crop.width,
                    right: 0,
                    height: crop.height,
                  }}
                  className="absolute bg-black/55 pointer-events-none transition-none"
                />

                {/* Interactive Crop Frame */}
                <div
                  style={{
                    top: crop.y,
                    left: crop.x,
                    width: crop.width,
                    height: crop.height,
                  }}
                  onPointerDown={(e) => startDrag(e, "move")}
                  className="absolute border-2 border-white/95 shadow-lg cursor-move touch-none group"
                >
                  {/* Grid lines inside crop box */}
                  <div className="w-full h-full grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                    <div className="border-r border-b border-white/40" />
                    <div className="border-r border-b border-white/40" />
                    <div className="border-b border-white/40" />
                    <div className="border-r border-b border-white/40" />
                    <div className="border-r border-b border-white/40" />
                    <div className="border-b border-white/40" />
                    <div className="border-r border-white/40" />
                    <div className="border-r border-white/40" />
                    <div />
                  </div>

                  {/* 4 Corner Handles (Google Forms Style) */}
                  <div
                    onPointerDown={(e) => startDrag(e, "tl")}
                    className="absolute -top-1.5 -left-1.5 size-3 bg-white border border-black/80 rounded-xs cursor-nwse-resize z-20 shadow-xs hover:scale-125 transition-transform"
                  />
                  <div
                    onPointerDown={(e) => startDrag(e, "tr")}
                    className="absolute -top-1.5 -right-1.5 size-3 bg-white border border-black/80 rounded-xs cursor-nesw-resize z-20 shadow-xs hover:scale-125 transition-transform"
                  />
                  <div
                    onPointerDown={(e) => startDrag(e, "bl")}
                    className="absolute -bottom-1.5 -left-1.5 size-3 bg-white border border-black/80 rounded-xs cursor-nesw-resize z-20 shadow-xs hover:scale-125 transition-transform"
                  />
                  <div
                    onPointerDown={(e) => startDrag(e, "br")}
                    className="absolute -bottom-1.5 -right-1.5 size-3 bg-white border border-black/80 rounded-xs cursor-nwse-resize z-20 shadow-xs hover:scale-125 transition-transform"
                  />

                  {/* 4 Edge indicators */}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 h-3 w-1 bg-white border border-black/80 rounded-xs pointer-events-none" />
                  <div className="absolute top-1/2 -right-1 -translate-y-1/2 h-3 w-1 bg-white border border-black/80 rounded-xs pointer-events-none" />
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-1 w-3 bg-white border border-black/80 rounded-xs pointer-events-none" />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-3 bg-white border border-black/80 rounded-xs pointer-events-none" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/20 shrink-0">
          <div>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => {
                if (displaySize.width > 0 && displaySize.height > 0) {
                  setCrop(getDefaultCrop(displaySize.width, displaySize.height))
                }
              }}
              className="cursor-pointer gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              title={language === "tr" ? "Kırpma alanını ortala ve sıfırla" : "Reset crop area to center"}
            >
              <RotateCcw className="size-3" />
              {language === "tr" ? "Sıfırla" : "Reset"}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="cursor-pointer text-xs"
            >
              {language === "tr" ? "İptal" : "Cancel"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveCrop}
              disabled={isUploading}
              className="cursor-pointer gap-1.5 text-xs font-semibold shadow-xs"
            >
              {isUploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              {isUploading
                ? language === "tr"
                  ? "Yükleniyor..."
                  : "Uploading..."
                : language === "tr"
                ? "Kaydet"
                : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
