import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { getPublicForm } from '@/lib/data/public-form';
import { PublicFormRenderer } from '@/components/public/public-form-renderer';
import { FormNotActive } from '@/components/public/form-not-active';
import { getAdminSession } from '@/lib/auth';

interface PublicFormPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export async function generateMetadata({
  params,
}: PublicFormPageProps): Promise<Metadata> {
  const { slug } = await params;
  const form = await getPublicForm(slug);

  if (!form) {
    return {
      title: 'Form Bulunamadı | FormMaker',
    };
  }

  const session = await getAdminSession();
  const isAdmin = Boolean(session);

  if (!form.isPublished && !isAdmin) {
    return {
      title: 'Form Yayında Değil | FormMaker',
    };
  }

  const title = `${form.title} | FormMaker`;
  const description = form.description || 'Formu doldurun';
  // Header images are cropped to 4:1, so only the fallback site icon has a known size
  const image = form.headerImage
    ? { url: form.headerImage, alt: form.title }
    : {
        url: '/web-app-manifest-512x512.png',
        width: 512,
        height: 512,
        alt: form.title,
      };
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [image],
    },
    twitter: {
      card: form.headerImage ? 'summary_large_image' : 'summary',
      title,
      description,
      images: [image.url],
    },
  };
}

export default async function PublicFormPage({
  params,
  searchParams,
}: PublicFormPageProps) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const isPreviewRequested = preview === 'true';

  const form = await getPublicForm(slug);

  if (!form) {
    notFound();
  }

  const session = await getAdminSession();
  const isAdmin = Boolean(session);

  if (!form.isPublished) {
    if (!isAdmin) {
      return <FormNotActive title={form.title} />;
    }
    return <PublicFormRenderer form={form} isPreview={true} />;
  }

  const isPreview = isAdmin && isPreviewRequested;

  return <PublicFormRenderer form={form} isPreview={isPreview} />;
}
