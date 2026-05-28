import { getUser } from '@/lib/auth/session';
import { Navbar } from '@/components/layout/Navbar';
import { BackToTop } from '@/components/common/BackToTop';
import { CampusProvider } from '@/components/providers/CampusProvider';

export default async function MainLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <CampusProvider>
      <Navbar userEmail={user?.email ?? null} />
      {children}
      <BackToTop />
    </CampusProvider>
  );
}
