'use client';

import { Home, ClipboardList, User } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

const tabs = [
  { id: 'home', label: 'Главная', icon: Home, path: '/app' },
  { id: 'orders', label: 'Заказы', icon: ClipboardList, path: '/app/orders' },
  { id: 'profile', label: 'Профиль', icon: User, path: '/app/profile' },
];

export function TabBar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => {
    if (path === '/app') return pathname === '/app';
    return pathname.startsWith(path);
  };

  return (
    <div className="tab-bar">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => router.push(tab.path)}
            className={`
              flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors
              ${isActive(tab.path) 
                ? 'text-teal-600' 
                : 'text-gray-400 hover:text-gray-600'
              }
            `}
          >
            <tab.icon className="w-6 h-6" strokeWidth={isActive(tab.path) ? 2.5 : 1.5} />
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
