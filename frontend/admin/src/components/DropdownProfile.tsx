import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import Transition from '../utils/Transition';
import { useAuth } from '../context/AuthContext';

import UserAvatar from '../images/user-avatar-32.png';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Quản trị viên',
  employee: 'Nhân viên',
};

function DropdownProfile({
  align
}) {

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const trigger = useRef(null);
  const dropdown = useRef(null);

  useEffect(() => {
    const clickHandler = ({ target }) => {
      if (!dropdown.current) return;
      if (!dropdownOpen || dropdown.current.contains(target) || trigger.current.contains(target)) return;
      setDropdownOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  useEffect(() => {
    const keyHandler = ({ keyCode }) => {
      if (!dropdownOpen || keyCode !== 27) return;
      setDropdownOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <div className="relative inline-flex">
      <button
        ref={trigger}
        className="inline-flex justify-center items-center group"
        aria-haspopup="true"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-expanded={dropdownOpen}
      >
        {user?.avatar_url ? (
          <img className="w-8 h-8 rounded-full object-cover" src={user.avatar_url} width="32" height="32" alt="User" />
        ) : (
          <img className="w-8 h-8 rounded-full" src={UserAvatar} width="32" height="32" alt="User" />
        )}
        <div className="flex items-center truncate">
          <span className="hidden md:inline max-w-[140px] truncate ml-2 text-sm font-medium text-gray-600 dark:text-gray-100 group-hover:text-gray-800 dark:group-hover:text-white">
            {user?.name ?? 'Tài khoản'}
          </span>
          <svg className="w-3 h-3 shrink-0 ml-1 fill-current text-gray-400 dark:text-gray-500" viewBox="0 0 12 12">
            <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
          </svg>
        </div>
      </button>

      <Transition
        className={`origin-top-right z-10 absolute top-full min-w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 py-1.5 rounded-lg shadow-lg overflow-hidden mt-1 ${align === 'right' ? 'right-0' : 'left-0'}`}
        show={dropdownOpen}
        enter="transition ease-out duration-200 transform"
        enterStart="opacity-0 -translate-y-2"
        enterEnd="opacity-100 translate-y-0"
        leave="transition ease-out duration-200"
        leaveStart="opacity-100"
        leaveEnd="opacity-0"
      >
        <div
          ref={dropdown}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => setDropdownOpen(false)}
        >
          <div className="pt-0.5 pb-2 px-3 mb-1 border-b border-gray-200 dark:border-gray-700/60">
            <div className="font-medium text-gray-800 dark:text-gray-100">{user?.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 italic">
              {ROLE_LABEL[user?.role ?? ''] ?? user?.role}
            </div>
          </div>
          <ul>
            <li>
              <Link
                to="/settings"
                onClick={() => setDropdownOpen(false)}
                className="w-full text-left font-medium text-sm text-gray-600 hover:text-violet-500 dark:text-gray-300 dark:hover:text-violet-400 flex items-center gap-2 py-1.5 px-3"
              >
                <Settings className="w-4 h-4" /> Cài đặt
              </Link>
            </li>
            <li>
              <button
                type="button"
                className="w-full text-left font-medium text-sm text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 flex items-center py-1.5 px-3 cursor-pointer"
                onClick={handleLogout}
              >
                Đăng xuất
              </button>
            </li>
          </ul>
        </div>
      </Transition>
    </div>
  )
}

export default DropdownProfile;
