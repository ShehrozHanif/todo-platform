'use client';

import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { TaskProvider } from '@/context/TaskContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MobileNav } from '@/components/layout/MobileNav';
import { TaskModal } from '@/components/tasks/TaskModal';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login');
    }
  }, [session, isPending, router]);

  if (isPending || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5FB] dark:bg-[#0D0E1A]">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <TaskProvider>
      <div className="flex h-screen overflow-hidden bg-[#F4F5FB] dark:bg-[#0D0E1A] transition-colors duration-200">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto pb-[82px] md:pb-0">
            {children}
          </main>
        </div>
      </div>
      <MobileNav />
      <TaskModal />
    </TaskProvider>
  );
}
