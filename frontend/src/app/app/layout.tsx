'use client';

import { TabBar } from '@/components/layout/TabBar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f1714]">
      <main className="safe-bottom">
        {children}
      </main>
      <TabBar />
    </div>
  );
}
