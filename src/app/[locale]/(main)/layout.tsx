import { getUser } from '@/lib/auth/session';
import { Navbar } from '@/components/layout/Navbar';

export default async function MainLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <>
      <Navbar userEmail={user?.email ?? null} />
      {children}
    </>
  );
}
