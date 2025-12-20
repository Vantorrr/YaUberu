'use client';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function Button({
  children,
  variant = 'primary',
  fullWidth = false,
  onClick,
  disabled = false,
  className = '',
}: ButtonProps) {
  const base = 'flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-200 px-6 py-4 text-base';
  
  const styles = {
    primary: 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30',
    secondary: 'bg-emerald-900/50 hover:bg-emerald-900/70 text-emerald-100 border border-emerald-700/50',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${base}
        ${styles[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
