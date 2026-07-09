import { getUser } from '@/lib/auth/session';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
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
      {/* flex 列布局让 Footer 在内容不足一屏时也贴底 */}
      <div className="flex min-h-screen flex-col">
        <Navbar userEmail={user?.email ?? null} />
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
      <BackToTop />
    </CampusProvider>
  );
}
