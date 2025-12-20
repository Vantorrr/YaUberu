'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { ArrowRight, User } from 'lucide-react';

export function WelcomeFooter() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="
        sticky bottom-0 left-0 right-0
        bg-gradient-to-t from-[#0A0F0D] via-[#0A0F0D] to-transparent
        px-6 pb-10 pt-8
      "
    >
      <div className="flex flex-col gap-4 max-w-sm mx-auto">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => router.push('/auth/register')}
          className="animate-pulse-glow"
        >
          Начать
          <ArrowRight className="w-5 h-5" />
        </Button>
        
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => router.push('/auth/login')}
        >
          <User className="w-4 h-4" />
          Уже есть аккаунт
        </Button>
      </div>

      {/* Terms */}
      <p className="text-center text-xs text-[rgba(240,253,244,0.3)] mt-6 max-w-xs mx-auto">
        Продолжая, вы соглашаетесь с{' '}
        <span className="text-[#34D399] hover:underline cursor-pointer">условиями использования</span>
      </p>
    </motion.div>
  );
}
