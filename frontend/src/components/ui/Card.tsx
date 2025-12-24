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
        bg-white
        border-2 border-gray-200 
        rounded-2xl 
        p-5
        shadow-sm
        ${onClick ? 'cursor-pointer hover:bg-gray-50 hover:border-gray-300 hover:shadow-md active:scale-[0.99] transition-all' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
