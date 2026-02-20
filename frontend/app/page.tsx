'use client';

import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending) {
      router.replace(session ? '/dashboard' : '/login');
    }
  }, [session, isPending, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F5FB] dark:bg-[#0D0E1A]">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
    </div>
  );
}
