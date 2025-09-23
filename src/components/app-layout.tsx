import SideNav from '@/components/side-nav';
import MobileNav from '@/components/mobile-nav';

interface LayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      <SideNav />
      
      <main className="flex-1 overflow-y-auto pb-16 sm:pb-0">
        <div className="h-full">
          {children}
        </div>
      </main>
      
      <MobileNav />
    </div>
  );
}