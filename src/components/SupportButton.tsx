import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, MessageCircle } from 'lucide-react';

interface SupportButtonProps {
  variant?: 'floating' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SupportButton: React.FC<SupportButtonProps> = ({ 
  variant = 'floating', 
  size = 'md',
  className = '' 
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/suporte');
  };

  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-14 h-14 text-lg'
  };

  const baseClasses = `
    flex items-center justify-center
    bg-blue-600 hover:bg-blue-700
    text-white font-medium
    rounded-full shadow-lg hover:shadow-xl
    transition-all duration-300 ease-in-out
    transform hover:scale-105
    focus:outline-none focus:ring-4 focus:ring-blue-300
    cursor-pointer
    ${sizeClasses[size]}
  `;

  const floatingClasses = `
    ${baseClasses}
    fixed bottom-6 right-6 z-50
  `;

  const inlineClasses = `
    ${baseClasses}
    relative
  `;

  const buttonClasses = variant === 'floating' ? floatingClasses : inlineClasses;

  return (
    <button
      onClick={handleClick}
      className={`${buttonClasses} ${className}`}
      title="Precisa de ajuda? Clique aqui!"
      aria-label="Botão de suporte - Ir para página de ajuda"
    >
      {variant === 'floating' ? (
        <HelpCircle className="w-6 h-6" />
      ) : (
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <span className="hidden sm:inline">Suporte</span>
        </div>
      )}
    </button>
  );
};

export default SupportButton;