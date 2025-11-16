import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  FileText, 
  Users, 
  Settings, 
  Search,
  Heart
} from 'lucide-react';

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

interface BottomTabNavigationProps {
  className?: string;
}

const defaultTabs: TabItem[] = [
  {
    id: 'home',
    label: 'Início',
    icon: <Home size={22} />,
    path: '/painel'
  },
  {
    id: 'budgets',
    label: 'Orçamentos',
    icon: <FileText size={22} />,
    path: '/orcamentos',
    badge: 3
  },
  {
    id: 'clients',
    label: 'Clientes',
    icon: <Users size={22} />,
    path: '/clientes'
  },
  {
    id: 'search',
    label: 'Buscar',
    icon: <Search size={22} />,
    path: '/busca'
  },
  {
    id: 'settings',
    label: 'Config',
    icon: <Settings size={22} />,
    path: '/configuracoes'
  }
];

export const BottomTabNavigation: React.FC<BottomTabNavigationProps> = ({ 
  className = '' 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const currentTab = defaultTabs.find(tab => 
      location.pathname.startsWith(tab.path)
    );
    return currentTab?.id || 'home';
  });

  const handleTabPress = (tab: TabItem) => {
    // Haptic feedback for iOS
    if ('vibrate' in navigator) {
      navigator.vibrate([10]);
    }

    setActiveTab(tab.id);
    navigate(tab.path);
  };

  const isTabActive = (tabId: string) => {
    return activeTab === tabId || 
           defaultTabs.find(tab => tab.id === tabId)?.path === location.pathname;
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`
        fixed bottom-0 left-0 right-0 z-50
        bg-white/95 backdrop-blur-xl border-t border-gray-200/50
        ios-bottom-navigation
        ${className}
      `}
    >
      {/* iOS-style blur overlay */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-xl" />
      
      <div className="relative flex items-center justify-around px-2 pt-2 pb-1">
        {defaultTabs.map((tab) => {
          const isActive = isTabActive(tab.id);
          
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleTabPress(tab)}
              className="
                relative flex flex-col items-center justify-center
                min-w-[60px] py-1 px-2 rounded-lg
                transition-all duration-200
              "
            >
              {/* Tab icon with animation */}
              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1,
                  color: isActive ? '#007AFF' : '#8E8E93'
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="relative mb-1"
              >
                {tab.icon}
                
                {/* Badge */}
                {tab.badge && tab.badge > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="
                      absolute -top-2 -right-2
                      bg-red-500 text-white text-xs
                      rounded-full min-w-[18px] h-[18px]
                      flex items-center justify-center
                      font-semibold
                    "
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </motion.div>
                )}
              </motion.div>
              
              {/* Tab label */}
              <motion.span
                animate={{
                  color: isActive ? '#007AFF' : '#8E8E93',
                  fontWeight: isActive ? 600 : 400
                }}
                className="text-xs leading-none"
              >
                {tab.label}
              </motion.span>
              
              {/* Active indicator */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="
                      absolute -top-1 left-1/2 transform -translate-x-1/2
                      w-1 h-1 bg-blue-500 rounded-full
                    "
                  />
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
      
      {/* iOS home indicator */}
      <div className="flex justify-center pb-1">
        <div className="w-32 h-1 bg-black/20 rounded-full" />
      </div>
    </motion.div>
  );
};

export default BottomTabNavigation;