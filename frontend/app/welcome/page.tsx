'use client';

import Link from 'next/link';
import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const features = [
  { icon: '📂', text: 'Organize tasks by priority & category' },
  { icon: '📊', text: 'Track progress with beautiful charts' },
  { icon: '⏰', text: 'Smart reminders — never miss a deadline' },
  { icon: '📅', text: 'Full calendar view for planning ahead' },
];

export default function WelcomePage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // If already logged in, go to dashboard
  useEffect(() => {
    if (!isPending && session) {
      router.replace('/dashboard');
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-500">
        <div className="w-8 h-8 rounded-full border-2 border-white border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-500 flex flex-col items-center px-6 pt-14 pb-10 relative overflow-hidden">
      {/* Dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-[.07]"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm flex-1">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-10 h-10 rounded-[12px] bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </div>
          <span className="text-[22px] font-extrabold text-white">TaskFlow</span>
        </div>

        {/* Heading */}
        <h1 className="text-[28px] font-extrabold text-white text-center leading-tight mb-3">
          Everything you need to stay productive
        </h1>
        <p className="text-indigo-200 text-[14px] text-center mb-10">
          Free forever. No credit card required.
        </p>

        {/* Feature list */}
        <div className="w-full flex flex-col gap-3 mb-10">
          {features.map((f) => (
            <div
              key={f.text}
              className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3.5"
            >
              <span className="text-[18px]">{f.icon}</span>
              <span className="text-[14px] text-white font-medium">{f.text}</span>
            </div>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Get Started button */}
        <Link
          href="/login"
          className="w-full bg-white text-indigo-700 font-bold text-[15px] rounded-xl py-3.5 text-center shadow-lg shadow-black/10 active:scale-[0.98] transition-transform"
        >
          Get Started
        </Link>

        <p className="text-indigo-200/60 text-[12px] text-center mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-white/80 underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
