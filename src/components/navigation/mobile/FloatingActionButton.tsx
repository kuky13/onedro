import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  FileText, 
  Users, 
  Search,
  Settings,
  X
} from 'lucide-react';

interface FABAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  color: string;
}

interface FloatingActionButtonProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  className = '',
  position = 'bottom-right'
}) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const actions: FABAction[] = [
    {
      id: 'new-budget',
      label: 'Novo Orçamento',
      icon: <FileText size={20} />,
      action: () => {
        navigate('/worm');
        setIsExpanded(false);
      },
      color: 'bg-blue-500'
    },
    {
      id: 'new-client',
      label: 'Novo Cliente',
      icon: <Users size={20} />,
      action: () => {
        navigate('/novo-cliente');
        setIsExpanded(false);
      },
      color: 'bg-green-500'
    },
    {
      id: 'search',
      label: 'Buscar',
      icon: <Search size={20} />,
      action: () => {
        navigate('/busca');
        setIsExpanded(false);
      },
      color: 'bg-purple-500'
    },
    {
      id: 'settings',
      label: 'Configurações',
      icon: <Settings size={20} />,
      action: () => {
        navigate('/configuracoes');
        setIsExpanded(false);
      },
      color: 'bg-gray-500'
    }
  ];

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-left':
        return 'bottom-20 left-4';
      case 'bottom-center':
        return 'bottom-20 left-1/2 transform -translate-x-1/2';
      case 'bottom-right':
      default:
        return 'bottom-20 right-4';
    }
  };

  const handleMainButtonPress = () => {
    // Haptic feedback for iOS
    if ('vibrate' in navigator) {
      navigator.vibrate(isExpanded ? [10] : [50]);
    }
    
    setIsExpanded(!isExpanded);
  };

  const handleActionPress = (action: FABAction) => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([30]);
    }
    
    action.action();
  };

  return (
    <div className={`fixed z-40 ${getPositionClasses()} ${className}`}>
      {/* Backdrop */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
          />
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-16 right-0 flex flex-col-reverse space-y-reverse space-y-3"
          >
            {actions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ 
                  opacity: 0, 
                  scale: 0,
                  x: 20,
                  y: 20
                }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  x: 0,
                  y: 0
                }}
                exit={{ 
                  opacity: 0, 
                  scale: 0,
                  x: 20,
                  y: 20
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                  delay: index * 0.05
                }}
                className="flex items-center space-x-3"
              >
                {/* Action Label */}
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.05 + 0.1 }}
                  className="
                    bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg
                    shadow-lg border border-gray-200/50
                    whitespace-nowrap
                  "
                >
                  <span className="text-sm font-medium text-gray-900">
                    {action.label}
                  </span>
                </motion.div>
                
                {/* Action Button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleActionPress(action)}
                  className={`
                    w-12 h-12 rounded-full text-white
                    shadow-lg border-2 border-white/20
                    flex items-center justify-center
                    transition-all duration-200
                    ${action.color}
                  `}
                  style={{
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  {action.icon}
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleMainButtonPress}
        className="
          w-14 h-14 bg-blue-600 rounded-full
          flex items-center justify-center
          text-white shadow-lg
          border-2 border-white/20
          transition-all duration-300
          hover:bg-blue-700
        "
        style={{
          boxShadow: '0 6px 25px rgba(59, 130, 246, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15)'
        }}
      >
        <motion.div
          animate={{ rotate: isExpanded ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {isExpanded ? <X size={24} /> : <Plus size={24} />}
        </motion.div>
      </motion.button>

      {/* Ripple Effect */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="
              absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
              w-14 h-14 bg-blue-600 rounded-full
              pointer-events-none -z-10
            "
          />
        )}
      </AnimatePresence>

      {/* iOS-style pulse animation when not expanded */}
      {!isExpanded && (
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="
            absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
            w-14 h-14 bg-blue-600 rounded-full
            pointer-events-none -z-10
          "
        />
      )}
    </div>
  );
};

export default FloatingActionButton;