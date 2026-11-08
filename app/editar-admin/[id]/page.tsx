import EditarAdminClient from './EditarAdminClient';

export async function generateStaticParams() {
  return [{ id: '1' }];
}

export default function Page({ params }: { params: { id: string } }) {
  return <EditarAdminClient id={params.id} />;
}
