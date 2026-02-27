'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/lib/theme';
import { useTaskContext } from '@/context/TaskContext';
import { useSession, signOut } from '@/lib/auth-client';
import { Task } from '@/lib/types';
import { PriorityBadge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/tasks': 'My Tasks',
  '/calendar': 'Calendar',
  '/analytics': 'Analytics',
  '/chat': 'AI Chat',
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { state, dispatch } = useTaskContext();
  const { data: session } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = resolvedTheme !== undefined;

  const title = pageTitles[pathname] ?? 'TaskFlow';
  const userName = session?.user?.name || session?.user?.email || 'User';
  const userInitial = userName[0].toUpperCase();

  // ── Search ──────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchResults: Task[] = query.trim().length >= 1
    ? state.tasks.filter(t =>
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        (t.description ?? '').toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6)
    : [];

  function handleSelectTask(task: Task) {
    dispatch({ type: 'OPEN_MODAL', payload: task });
    setQuery('');
    setSearchOpen(false);
  }

  // ── Notifications ───────────────────────────────────
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const todayStr = new Date().toISOString().split('T')[0];

  const overdueItems = state.tasks.filter(
    t => !t.completed && t.dueDate && t.dueDate < todayStr
  );
  const dueTodayItems = state.tasks.filter(
    t => !t.completed && t.dueDate === todayStr
  );
  const notifCount = overdueItems.length + dueTodayItems.length;

  // ── Profile ─────────────────────────────────────────
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close all dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close search on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') { setSearchOpen(false); setQuery(''); }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <header className="h-14 border-b border-gray-200 dark:border-[#252742] bg-white dark:bg-[#151628] flex items-center px-4 md:px-6 gap-2 md:gap-4 flex-shrink-0 transition-colors duration-200 relative z-40">

      {/* Mobile: permanent TaskFlow brand logo */}
      <div className="flex md:hidden items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
        </div>
        <span className="text-[16px] font-extrabold text-gray-900 dark:text-white">TaskFlow</span>
      </div>

      {/* Desktop: current page title */}
      <h1 className="hidden md:block text-[17px] font-bold text-gray-900 dark:text-white flex-shrink-0">{title}</h1>

      {/* ── Search ── */}
      <div ref={searchRef} className="relative flex-1 md:max-w-sm">
        <div className={`flex items-center gap-2 bg-gray-100 dark:bg-[#1C1D30] border rounded-[10px] px-3 py-2 md:py-1.5 transition-all duration-200 ${searchOpen || query ? 'border-indigo-500' : 'border-gray-200 dark:border-[#252742]'}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-gray-400 dark:text-[#5B6180] flex-shrink-0">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            placeholder="Search tasks…"
            onChange={e => { setQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            className="bg-transparent border-none outline-none text-[14px] md:text-[13.5px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#5B6180] w-full"
          />
          {query && (
            <button onClick={() => { setQuery(''); setSearchOpen(false); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Search dropdown */}
        {searchOpen && query.trim().length >= 1 && (
          <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white dark:bg-[#1C1D30] border border-gray-200 dark:border-[#252742] rounded-xl shadow-xl overflow-hidden">
            {searchResults.length === 0 ? (
              <div className="px-4 py-5 text-center text-[13px] text-gray-400 dark:text-[#5B6180]">
                No tasks match &ldquo;{query}&rdquo;
              </div>
            ) : (
              <>
                <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold text-gray-400 dark:text-[#5B6180] uppercase tracking-[.6px]">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </p>
                {searchResults.map(task => (
                  <button
                    key={task.id}
                    onClick={() => handleSelectTask(task)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#252742] transition-colors text-left"
                  >
                    {/* Completion indicator */}
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5 ${task.completed ? 'bg-emerald-500' : task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-medium truncate ${task.completed ? 'line-through text-gray-400 dark:text-[#5B6180]' : 'text-gray-900 dark:text-white'}`}>
                        {/* Highlight matching text */}
                        {highlightMatch(task.title, query)}
                      </p>
                      {task.dueDate && (
                        <p className="text-[11px] text-gray-400 dark:text-[#5B6180] mt-0.5 capitalize">
                          {task.category} · {formatDate(task.dueDate)}
                        </p>
                      )}
                    </div>
                    <PriorityBadge priority={task.priority} />
                  </button>
                ))}
                <div className="border-t border-gray-100 dark:border-[#252742] px-3 py-2">
                  <button
                    onClick={() => { router.push('/tasks'); setQuery(''); setSearchOpen(false); }}
                    className="text-[12px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    View all tasks →
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right-side actions */}
      <div className="ml-auto flex items-center gap-3">

        {/* ── Dark mode toggle ── */}
        {mounted && (
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-lg text-gray-500 dark:text-[#9CA3C8] hover:bg-gray-100 dark:hover:bg-[#1C1D30] hover:text-gray-800 dark:hover:text-white transition-all duration-200"
            title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {resolvedTheme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>
        )}

        {/* ── Notification bell ── */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setNotifOpen(p => !p); setProfileOpen(false); }}
            className="relative p-1.5 text-gray-500 dark:text-[#9CA3C8] hover:text-gray-800 dark:hover:text-white transition-colors duration-200"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            {notifCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#151628] flex items-center justify-center text-[9px] font-bold text-white px-0.5">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {notifOpen && (
            <div className="fixed left-2 right-2 top-16 md:absolute md:left-auto md:right-0 md:top-[calc(100%+10px)] md:w-80 bg-white dark:bg-[#1C1D30] border border-gray-200 dark:border-[#252742] rounded-xl shadow-xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-[#252742] flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-gray-900 dark:text-white">Notifications</h3>
                {notifCount > 0 && (
                  <span className="text-[11px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold px-2 py-0.5 rounded-full">
                    {notifCount} new
                  </span>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto">
                {notifCount === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-[#5B6180]">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="mb-2 opacity-50">
                      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                    </svg>
                    <p className="text-[13px]">All caught up!</p>
                    <p className="text-[11px] mt-0.5">No pending alerts</p>
                  </div>
                ) : (
                  <>
                    {overdueItems.length > 0 && (
                      <div>
                        <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-red-500 uppercase tracking-[.6px]">
                          Overdue · {overdueItems.length}
                        </p>
                        {overdueItems.map(task => (
                          <NotifItem key={task.id} task={task} type="overdue"
                            onClick={() => { dispatch({ type: 'OPEN_MODAL', payload: task }); setNotifOpen(false); }} />
                        ))}
                      </div>
                    )}
                    {dueTodayItems.length > 0 && (
                      <div>
                        <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-amber-500 uppercase tracking-[.6px]">
                          Due Today · {dueTodayItems.length}
                        </p>
                        {dueTodayItems.map(task => (
                          <NotifItem key={task.id} task={task} type="today"
                            onClick={() => { dispatch({ type: 'OPEN_MODAL', payload: task }); setNotifOpen(false); }} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {notifCount > 0 && (
                <div className="border-t border-gray-100 dark:border-[#252742] px-4 py-2.5">
                  <button
                    onClick={() => { router.push('/tasks'); setNotifOpen(false); }}
                    className="text-[12px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    View all tasks →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── New Task button — desktop only ── */}
        <button
          onClick={() => dispatch({ type: 'OPEN_MODAL' })}
          className="hidden md:flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[.98] text-white text-[13.5px] font-semibold px-4 py-2 rounded-lg shadow-[0_2px_8px_rgba(79,70,229,.35)] hover:shadow-[0_4px_14px_rgba(79,70,229,.45)] transition-all duration-200"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Task
        </button>

        {/* ── Profile avatar ── */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => { setProfileOpen(p => !p); setNotifOpen(false); }}
            className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center text-white text-[14px] font-bold hover:ring-2 hover:ring-indigo-400 hover:ring-offset-2 hover:ring-offset-white dark:hover:ring-offset-[#151628] transition-all duration-200"
            title="Profile"
          >
            {userInitial}
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-[calc(100%+10px)] w-52 bg-white dark:bg-[#1C1D30] border border-gray-200 dark:border-[#252742] rounded-xl shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-[#252742]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0">{userInitial}</div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">{userName}</p>
                    <p className="text-[11px] text-gray-400 dark:text-[#5B6180] truncate">{session?.user?.email}</p>
                  </div>
                </div>
              </div>
              <div className="p-1.5">
                <button onClick={() => { setProfileOpen(false); signOut().then(() => router.push('/login')); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left font-medium">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ── helpers ──────────────────────────────────────────────────

function highlightMatch(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-[2px] not-italic">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function NotifItem({ task, type, onClick }: { task: Task; type: 'overdue' | 'today'; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#252742] transition-colors text-left">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${type === 'overdue' ? 'bg-red-500' : 'bg-amber-400'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate">{task.title}</p>
        <p className={`text-[11px] font-medium mt-0.5 ${type === 'overdue' ? 'text-red-500' : 'text-amber-500'}`}>
          {type === 'overdue' ? `Overdue · ${formatDate(task.dueDate)}` : `Due today · ${formatDate(task.dueDate)}`}
        </p>
      </div>
      <PriorityBadge priority={task.priority} className="flex-shrink-0 mt-0.5" />
    </button>
  );
}
