import React from 'react';
import { Store as StoreIcon } from 'lucide-react';

import UserMenu from '../components/DropdownProfile';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const { user, stores, activeStore, setActiveStore } = useAuth();

  return (
    <header className="sticky top-0 before:absolute before:inset-0 before:backdrop-blur-md max-lg:before:bg-white/90 dark:max-lg:before:bg-gray-800/90 before:-z-10 z-30 max-lg:shadow-xs lg:before:bg-gray-100/90 dark:lg:before:bg-gray-900/90">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:border-b border-gray-200 dark:border-gray-700/60">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="shrink-0 text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 lg:hidden"
              aria-controls="sidebar"
              aria-expanded={sidebarOpen}
              onClick={(e) => { e.stopPropagation(); setSidebarOpen(!sidebarOpen); }}
            >
              <span className="sr-only">Open sidebar</span>
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="5" width="16" height="2" />
                <rect x="4" y="11" width="16" height="2" />
                <rect x="4" y="17" width="16" height="2" />
              </svg>
            </button>

            {user?.role === 'seller' && stores.length > 0 && (
              <div className="flex min-w-0 items-center gap-2">
                <StoreIcon className="hidden h-4 w-4 shrink-0 text-gray-400 sm:block" />
                <select
                  value={activeStore?.id ?? ''}
                  onChange={(e) => {
                    const s = stores.find((x) => x.id === Number(e.target.value));
                    if (s) setActiveStore(s);
                  }}
                  aria-label="Chọn gian hàng"
                  className="w-full max-w-[150px] truncate rounded-lg border border-gray-300 bg-white py-1.5 pl-2.5 text-sm font-medium text-gray-700 outline-none focus:border-violet-500 sm:max-w-[240px] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <ThemeToggle />
            <hr className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-gray-700/60 border-none" />
            <UserMenu align="right" />
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
