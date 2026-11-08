import { Suspense } from 'react';
import EditarAdminClient from './EditarAdminClient';

export function generateStaticParams() {
  return [];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return (
    <Suspense fallback={<div className="p-6 text-center text-gray-500 font-semibold">Cargando...</div>}>
      <EditarAdminClient id={resolvedParams.id} />
    </Suspense>
  );
}
