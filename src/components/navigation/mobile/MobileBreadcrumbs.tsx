import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

interface MobileBreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export const MobileBreadcrumbs: React.FC<MobileBreadcrumbsProps> = ({ 
  items = [], 
  className = '' 
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-generate breadcrumbs from current path if not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Início', path: '/', icon: <Home size={16} /> }
    ];

    let currentPath = '';
    pathSegments.forEach((segment) => {
      currentPath += `/${segment}`;
      const label = segment.charAt(0).toUpperCase() + segment.slice(1);
      breadcrumbs.push({ label, path: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbItems = items.length > 0 ? items : generateBreadcrumbs();

  const handleNavigation = (path: string) => {
    // Haptic feedback for iOS
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    navigate(path);
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`ios-safe-top bg-white border-b border-gray-200 ${className}`}
    >
      <div className="px-4 py-3">
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide">
          {breadcrumbItems.map((item, index) => (
            <React.Fragment key={item.path}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleNavigation(item.path)}
                className={`
                  flex items-center space-x-1 px-2 py-1 rounded-lg text-sm font-medium
                  transition-colors duration-200 whitespace-nowrap
                  ${index === breadcrumbItems.length - 1
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  }
                `}
              >
                {item.icon && (
                  <span className="flex-shrink-0">{item.icon}</span>
                )}
                <span>{item.label}</span>
              </motion.button>
              
              {index < breadcrumbItems.length - 1 && (
                <ChevronRight 
                  size={14} 
                  className="text-gray-400 flex-shrink-0" 
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </motion.nav>
  );
};

export default MobileBreadcrumbs;