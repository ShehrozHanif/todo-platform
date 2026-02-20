'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/lib/theme';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTaskContext } from '@/context/TaskContext';
import { categoryColors, categoryLabels } from '@/lib/data';
import { useSession } from '@/lib/auth-client';

const COLOR_OPTIONS = [
  '#4F46E5', '#7C3AED', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#06B6D4', '#6366F1',
];

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/tasks',
    label: 'Tasks',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    href: '/calendar',
    label: 'Calendar',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { state, dispatch } = useTaskContext();
  const { data: session } = useSession();
  const mounted = resolvedTheme !== undefined; // custom hook: undefined = not yet mounted

  const userName = session?.user?.name || session?.user?.email || 'User';
  const userEmail = session?.user?.email || '';
  const userInitial = userName[0].toUpperCase();

  // New category inline form
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(COLOR_OPTIONS[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showNewCat) setTimeout(() => inputRef.current?.focus(), 50);
  }, [showNewCat]);

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    dispatch({ type: 'ADD_CUSTOM_CATEGORY', payload: { name: newCatName.trim(), color: newCatColor } });
    setNewCatName('');
    setNewCatColor(COLOR_OPTIONS[0]);
    setShowNewCat(false);
  }

  function handleCategoryClick(catKey: string) {
    dispatch({ type: 'SET_CATEGORY', payload: catKey });
    router.push('/tasks');
  }

  function clearCategory() {
    dispatch({ type: 'SET_CATEGORY', payload: null });
  }

  const pendingCount = state.tasks.filter(t => !t.completed).length;
  const builtInCategories = ['work', 'personal', 'study', 'health'] as const;

  return (
    <aside className="hidden md:flex w-[240px] flex-shrink-0 flex-col bg-white dark:bg-[#151628] border-r border-gray-200 dark:border-[#252742] h-full overflow-hidden transition-colors duration-200 z-10">

      {/* Logo */}
      <div className="px-5 py-6 border-b border-gray-200 dark:border-[#252742] flex items-center gap-2.5">
        <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
        </div>
        <span className="text-[17px] font-extrabold text-gray-900 dark:text-white">TaskFlow</span>
      </div>

      {/* Nav */}
      <div className="px-2 py-4">
        <p className="px-3 mb-2 text-[10px] font-bold text-gray-400 dark:text-[#5B6180] uppercase tracking-[.8px]">Main</p>
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={item.href === '/tasks' ? clearCategory : undefined}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-[10px] mx-1 my-0.5 text-[13.5px] font-medium transition-all duration-200',
                active
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-gray-500 dark:text-[#9CA3C8] hover:bg-gray-100 dark:hover:bg-[#1C1D30] hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <span className={cn(active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-[#5B6180]')}>
                {item.icon}
              </span>
              {item.label}
              {item.label === 'Tasks' && pendingCount > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Categories */}
      <div className="px-2 flex-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-bold text-gray-400 dark:text-[#5B6180] uppercase tracking-[.8px]">Categories</p>

        {/* Built-in categories */}
        {builtInCategories.map(cat => {
          const count = state.tasks.filter(t => t.category === cat).length;
          const isActive = state.activeCategory === cat && pathname === '/tasks';
          return (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] mx-0 my-0.5 transition-all duration-200 text-left',
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-900/20'
                  : 'hover:bg-gray-100 dark:hover:bg-[#1C1D30]'
              )}
            >
              <span
                className={cn('w-2 h-2 rounded-full flex-shrink-0 transition-all duration-200', isActive && 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-[#151628]')}
                style={{ backgroundColor: categoryColors[cat], ...(isActive ? { ringColor: categoryColors[cat] } : {}) }}
              />
              <span className={cn(
                'text-[13px] flex-1 font-medium',
                isActive ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-gray-600 dark:text-[#9CA3C8]'
              )}>
                {categoryLabels[cat]}
              </span>
              <span className={cn('text-[11px]', isActive ? 'text-indigo-500 dark:text-indigo-400 font-semibold' : 'text-gray-400 dark:text-[#5B6180]')}>
                {count}
              </span>
            </button>
          );
        })}

        {/* Custom categories */}
        {state.customCategories.map(cat => {
          const count = state.tasks.filter(t => t.category === cat.id).length;
          const isActive = state.activeCategory === cat.id && pathname === '/tasks';
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] my-0.5 transition-all duration-200 text-left',
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-900/20'
                  : 'hover:bg-gray-100 dark:hover:bg-[#1C1D30]'
              )}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
              <span className={cn(
                'text-[13px] flex-1 font-medium truncate',
                isActive ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-gray-600 dark:text-[#9CA3C8]'
              )}>
                {cat.name}
              </span>
              <span className={cn('text-[11px]', isActive ? 'text-indigo-500 dark:text-indigo-400 font-semibold' : 'text-gray-400 dark:text-[#5B6180]')}>
                {count}
              </span>
            </button>
          );
        })}

        {/* New Category inline form */}
        {showNewCat ? (
          <form onSubmit={handleAddCategory} className="mx-1 mt-1 p-2.5 rounded-[10px] bg-gray-50 dark:bg-[#1C1D30] border border-gray-200 dark:border-[#252742]">
            <input
              ref={inputRef}
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="Category name…"
              maxLength={24}
              className="w-full bg-white dark:bg-[#151628] border border-gray-200 dark:border-[#252742] rounded-lg px-2.5 py-1.5 text-[12.5px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#5B6180] outline-none focus:border-indigo-500 transition-colors mb-2"
            />
            {/* Color swatches */}
            <div className="flex gap-1.5 flex-wrap mb-2.5">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewCatColor(c)}
                  className={cn(
                    'w-5 h-5 rounded-full transition-all duration-150',
                    newCatColor === c ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-offset-[#1C1D30] scale-110' : 'hover:scale-110'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => { setShowNewCat(false); setNewCatName(''); }}
                className="flex-1 py-1 rounded-lg text-[11px] font-semibold text-gray-500 dark:text-[#9CA3C8] bg-gray-100 dark:bg-[#252742] hover:bg-gray-200 dark:hover:bg-[#2E2F4A] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newCatName.trim()}
                className="flex-1 py-1 rounded-lg text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowNewCat(true)}
            className="w-full flex items-center gap-2 px-3 py-2 mt-1 rounded-[10px] text-[12.5px] font-medium text-gray-400 dark:text-[#5B6180] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all duration-200 group"
          >
            <span className="w-5 h-5 rounded-md border-2 border-dashed border-gray-300 dark:border-[#3A3B52] group-hover:border-indigo-400 flex items-center justify-center transition-colors">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            New Category
          </button>
        )}
      </div>

      {/* User + dark toggle */}
      <div className="p-3 border-t border-gray-200 dark:border-[#252742] flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0">
          {userInitial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">{userName}</p>
          <p className="text-[11px] text-gray-400 dark:text-[#5B6180] truncate">{userEmail}</p>
        </div>
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1C1D30] border border-gray-200 dark:border-[#252742] flex items-center justify-center text-gray-500 dark:text-[#9CA3C8] hover:border-indigo-400 transition-all duration-200"
          title="Toggle dark mode"
        >
          {mounted && resolvedTheme === 'dark' ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>
      </div>
    </aside>
  );
}
