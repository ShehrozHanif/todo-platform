'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { signUp } from '@/lib/auth-client';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await signUp.email({ name, email, password });
      if (result?.error) {
        setError(result.error.message || 'Registration failed');
        setLoading(false);
      } else {
        // Full page reload ensures session cookie is sent on next request
        window.location.href = '/dashboard';
      }
    } catch {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  }

  const features = [
    { icon: '📋', text: 'Organise tasks by priority & category' },
    { icon: '📊', text: 'Track progress with beautiful charts' },
    { icon: '🔔', text: 'Smart reminders — never miss a deadline' },
    { icon: '📅', text: 'Full calendar view for planning ahead' },
  ];

  return (
    <div className="min-h-screen bg-[#F4F5FB] dark:bg-[#0D0E1A] flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-500 flex-col justify-center items-center px-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[.07]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
        <div className="relative z-10 text-center max-w-md">
          <div className="inline-flex items-center gap-3 mb-12">
            <div className="w-11 h-11 rounded-[14px] bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
            </div>
            <span className="text-[26px] font-extrabold text-white">TaskFlow</span>
          </div>
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">Everything you need<br />to stay productive</h2>
          <p className="text-indigo-200 text-[15px] mb-10">Free forever. No credit card required.</p>
          <div className="flex flex-col gap-3 text-left">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3">
                <span className="text-xl">{f.icon}</span>
                <span className="text-[13.5px] text-white/90 font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full lg:w-[480px] flex flex-col justify-center px-8 sm:px-14 bg-white dark:bg-[#151628]"
      >
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          </div>
          <span className="text-[18px] font-extrabold text-gray-900 dark:text-white">TaskFlow</span>
        </div>

        <h1 className="text-[26px] font-extrabold text-gray-900 dark:text-white mb-1.5">Create your account</h1>
        <p className="text-[13.5px] text-gray-500 dark:text-[#9CA3C8] mb-7">Start organising in seconds</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-gray-500 dark:text-[#9CA3C8] uppercase tracking-[.6px]">Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="Jane Smith"
              className="bg-gray-100 dark:bg-[#1C1D30] border border-gray-200 dark:border-[#252742] rounded-[10px] px-3.5 py-2.5 text-[13.5px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#5B6180] outline-none focus:border-indigo-500 transition-colors" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-gray-500 dark:text-[#9CA3C8] uppercase tracking-[.6px]">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
              className="bg-gray-100 dark:bg-[#1C1D30] border border-gray-200 dark:border-[#252742] rounded-[10px] px-3.5 py-2.5 text-[13.5px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#5B6180] outline-none focus:border-indigo-500 transition-colors" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-gray-500 dark:text-[#9CA3C8] uppercase tracking-[.6px]">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min. 8 characters"
              className="bg-gray-100 dark:bg-[#1C1D30] border border-gray-200 dark:border-[#252742] rounded-[10px] px-3.5 py-2.5 text-[13.5px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#5B6180] outline-none focus:border-indigo-500 transition-colors" />
          </div>

          {error && (
            <p className="text-[13px] text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button type="submit" size="lg" className="w-full mt-1" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-[13px] text-gray-500 dark:text-[#9CA3C8] mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
