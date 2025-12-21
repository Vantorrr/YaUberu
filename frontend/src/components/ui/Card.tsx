'use client';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-teal-950/40 
        border border-teal-800/30 
        rounded-2xl 
        p-5
        ${onClick ? 'cursor-pointer hover:bg-teal-950/60 hover:border-teal-700/40 active:scale-[0.99] transition-all' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
