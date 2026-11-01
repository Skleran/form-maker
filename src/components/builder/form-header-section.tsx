'use client';

import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { AlignLeft, Crop, ImagePlus, Trash2, Type } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Hint } from '@/components/hint';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useBuilderStore } from '@/stores/use-builder-store';
import type { FormBuilderValues } from '@/lib/validations/form';
import { dict } from '@/lib/dictionary';
import { HeaderImageCropModal } from './header-image-crop-modal';

const HEADER_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export const FormHeaderSection = React.memo(function FormHeaderSection() {
  const { register, control, setValue, getValues } =
    useFormContext<FormBuilderValues>();
  const [headerImage, headerImageRaw, headerImageCrop] = useWatch({
    control,
    name: ['headerImage', 'headerImageRaw', 'headerImageCrop'],
    exact: true,
  });

  const headerImageInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedRawFile, setSelectedRawFile] = React.useState<File | null>(
    null,
  );
  const [rawImageForCrop, setRawImageForCrop] = React.useState<string | null>(
    null,
  );
  const [activeCropForModal, setActiveCropForModal] =
    React.useState<FormBuilderValues['headerImageCrop']>(null);
  const [isCropModalOpen, setIsCropModalOpen] = React.useState(false);

  const handleHeaderImageFileSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error(
        'Kapak görseli boyutu en fazla 10 MB olabilir.',
      );
      return;
    }
    if (!HEADER_IMAGE_TYPES.includes(file.type)) {
      toast.error(
        'Lütfen geçerli bir görsel dosyası seçin (PNG, JPG, WebP).',
      );
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedRawFile(file);
    setRawImageForCrop(previewUrl);
    setActiveCropForModal(null);
    setIsCropModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={headerImageInputRef}
        accept={HEADER_IMAGE_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleHeaderImageFileSelect(file);
          e.target.value = '';
        }}
      />

      {headerImage ? (
        <div className="relative group overflow-hidden rounded-xl border bg-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={headerImage}
            crossOrigin={
              headerImage.startsWith('blob:') || headerImage.startsWith('data:')
                ? undefined
                : 'anonymous'
            }
            alt="Form Kapak Görseli"
            className="w-full aspect-[4/1] object-cover block"
          />
          <div className="absolute top-3 right-3 flex items-center gap-2 opacity-90 group-hover:opacity-100 group-hover:duration-0 transition-opacity">
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={() => {
                const sourceImage =
                  headerImageRaw || rawImageForCrop || headerImage;
                if (sourceImage) {
                  setSelectedRawFile(null);
                  setRawImageForCrop(sourceImage);
                  setActiveCropForModal(headerImageCrop || null);
                  setIsCropModalOpen(true);
                }
              }}
              className="cursor-pointer gap-1.5 shadow-sm bg-background/85 hover:bg-background backdrop-blur-xs text-xs font-medium"
            >
              <Crop className="size-3.5" />
              <span className="hidden sm:inline">
                Pozisyonu Ayarla
              </span>
              <span className="sm:hidden">
                Kırp
              </span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={() => headerImageInputRef.current?.click()}
              className="cursor-pointer gap-1.5 shadow-sm bg-background/85 hover:bg-background backdrop-blur-xs text-xs font-medium"
            >
              <ImagePlus className="size-3.5" />
              <span className="hidden sm:inline">
                Görseli Değiştir
              </span>
              <span className="sm:hidden">
                Değiştir
              </span>
            </Button>
            <Hint label="Kapak Görselini Kaldır">
              <Button
                type="button"
                variant="destructive"
                size="icon-xs"
                onClick={() => {
                  useBuilderStore.getState().pushHistory(getValues());
                  setValue('headerImage', null, { shouldDirty: true });
                  setValue('headerImageRaw', null, { shouldDirty: true });
                  setValue('headerImageCrop', null, { shouldDirty: true });
                  setSelectedRawFile(null);
                  setRawImageForCrop(null);
                  setActiveCropForModal(null);
                }}
                className="cursor-pointer shadow-sm bg-destructive/20 hover:bg-destructive/30 dark:bg-destructive/30 dark:hover:bg-destructive/40"
                aria-label="Kapak Görselini Kaldır"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </Hint>
          </div>
        </div>
      ) : (
        <div className="flex justify-end mb-4">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => headerImageInputRef.current?.click()}
            className="cursor-pointer gap-1.5 text-xs"
          >
            <ImagePlus className="size-3.5" />
            Kapak Görseli Ekle
          </Button>
        </div>
      )}

      <Card className="relative overflow-hidden py-0">
        <div className="p-6 space-y-4">
          {/* Form Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="form-builder-title"
                className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 select-none"
              >
                <Type className="size-3.5" />
                <span>Form Başlığı</span>
              </label>
              <span className="text-[11px] text-muted-foreground/60 select-none">
                Zorunlu
              </span>
            </div>
            <Input
              id="form-builder-title"
              placeholder={dict.builder.canvas.titlePlaceholder}
              {...register('title')}
              className="sm:px-3.5 sm:py-2 font-semibold tracking-normal sm:text-2xl sm:font-bold sm:tracking-tight placeholder:text-muted-foreground/50 h-auto w-full"
            />
          </div>

          {/* Form Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="form-builder-description"
                className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 select-none"
              >
                <AlignLeft className="size-3.5" />
                <span>
                  Form Açıklaması
                </span>
              </label>
              <span className="text-[11px] text-muted-foreground/60 select-none">
                İsteğe bağlı
              </span>
            </div>
            <Textarea
              id="form-builder-description"
              placeholder={dict.builder.canvas.descPlaceholder}
              rows={2}
              {...register('description')}
              className="sm:px-3.5 sm:py-2 text-sm placeholder:text-muted-foreground/50 resize-none min-h-[56px] w-full"
            />
          </div>
        </div>
      </Card>

      {/* Google Forms Style Header Image Crop Modal */}
      {rawImageForCrop && (
        <HeaderImageCropModal
          key={rawImageForCrop}
          isOpen={isCropModalOpen}
          imageSrc={rawImageForCrop}
          rawFile={selectedRawFile}
          existingRawUrl={headerImageRaw || headerImage}
          initialCrop={activeCropForModal}
          onClose={() => {
            setIsCropModalOpen(false);
            if (rawImageForCrop.startsWith('blob:')) {
              URL.revokeObjectURL(rawImageForCrop);
            }
            setSelectedRawFile(null);
          }}
          onSave={(result) => {
            useBuilderStore.getState().pushHistory(getValues());

            // Track uploaded files in builder session for atomic reconciliation
            if (result.headerImage) {
              useBuilderStore
                .getState()
                .addSessionUploadedFile(result.headerImage);
            }
            if (result.headerImageRaw) {
              useBuilderStore
                .getState()
                .addSessionUploadedFile(result.headerImageRaw);
            }

            setValue('headerImage', result.headerImage, { shouldDirty: true });
            setValue('headerImageRaw', result.headerImageRaw, {
              shouldDirty: true,
            });
            setValue('headerImageCrop', result.headerImageCrop, {
              shouldDirty: true,
            });
            setActiveCropForModal(result.headerImageCrop);
            setSelectedRawFile(null);

            if (rawImageForCrop.startsWith('blob:')) {
              URL.revokeObjectURL(rawImageForCrop);
            }
          }}
        />
      )}
    </div>
  );
});
