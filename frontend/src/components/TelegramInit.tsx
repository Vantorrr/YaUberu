'use client';

import { useEffect } from 'react';

export function TelegramInit() {
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      tg.expand();
      
      // Set theme
      tg.setHeaderColor('#0f1714');
      tg.setBackgroundColor('#0f1714');
      
      console.log('[TG] WebApp initialized and expanded');
    }
  }, []);

  return null;
}

