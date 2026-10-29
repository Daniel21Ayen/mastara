import { redirect } from 'next/navigation';

export default async function ContentItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/content/material/studio?id=${encodeURIComponent(id)}`);
}
