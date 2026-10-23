import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { getPublicFormBySlug } from '@/actions/submission-actions';
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
  const res = await getPublicFormBySlug(slug);

  if (!res.success || !res.data) {
    return {
      title: 'Form Bulunamadı | FormMaker',
    };
  }

  const form = res.data;
  const session = await getAdminSession();
  const isAdmin = Boolean(session);

  if (!form.isPublished && !isAdmin) {
    return {
      title: 'Form Yayında Değil | FormMaker',
    };
  }

  const title = `${form.title} | FormMaker`;
  const description = form.description || 'Formu doldurun';
  // Use form headerImage if one is uploaded, otherwise fallback to the site icon
  const imageUrl = form.headerImage || '/web-app-manifest-512x512.png';
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [
        {
          url: imageUrl,
          width: 512,
          height: 512,
          alt: form.title,
        },
      ],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [imageUrl],
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

  const res = await getPublicFormBySlug(slug);

  if (!res.success || !res.data) {
    notFound();
  }

  const form = res.data;
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
