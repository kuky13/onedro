import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

const RevolutionFloatingButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const location = useLocation();

  // Verificar se está nas rotas corretas
  const shouldShow = location.pathname === '/plans/m' || location.pathname === '/plans/a';

  useEffect(() => {
    if (shouldShow) {
      // Mostrar o botão após um pequeno delay para melhor UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [shouldShow]);

  const handleClick = () => {
    const element = document.querySelector('[data-section="revolucionar"]');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          relative overflow-hidden
          w-12 h-12 rounded-full
          bg-gradient-to-r from-purple-600 to-blue-600
          hover:from-purple-700 hover:to-blue-700
          text-white
          shadow-lg hover:shadow-xl
          transform transition-all duration-300 ease-in-out
          ${isHovered ? 'scale-110 shadow-2xl' : 'scale-100'}
          border-0
          group
          flex items-center justify-center
          p-0
        `}
      >
        {/* Efeito de brilho animado */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
        
        {/* Ícone da seta */}
        <ChevronDown className={`w-6 h-6 transition-transform duration-300 relative z-10 ${isHovered ? 'scale-110' : ''}`} />
        
        {/* Efeito de pulso */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 opacity-75 animate-ping" />
      </Button>
    </div>
  );
};

export default RevolutionFloatingButton;