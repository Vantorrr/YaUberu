'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base = 'flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-200';
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-4 text-base',
    lg: 'px-8 py-5 text-lg',
  };

  const styles = {
    primary: 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30',
    secondary: 'bg-emerald-900/50 hover:bg-emerald-900/70 text-emerald-100 border border-emerald-700/50',
    outline: 'border-2 border-emerald-500 text-emerald-500 hover:bg-emerald-500/10',
    ghost: 'text-gray-400 hover:text-white hover:bg-white/5',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`
        ${base}
        ${sizes[size]}
        ${styles[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${(disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : children}
    </button>
  );
}
