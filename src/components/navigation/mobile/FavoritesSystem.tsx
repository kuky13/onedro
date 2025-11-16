import React, { useState, useCallback, useRef } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Star, 
  StarOff, 
  Grip, 
  Trash2, 
  Plus,
  FileText,
  Users,
  DollarSign,
  Settings,
  TrendingUp,
  X
} from 'lucide-react';

interface FavoriteItem {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  color: string;
  type: 'budget' | 'client' | 'page' | 'setting';
  createdAt: Date;
}

interface FavoritesSystemProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

// Mock favorites data
const initialFavorites: FavoriteItem[] = [
  {
    id: '1',
    title: 'Dashboard',
    description: 'Painel principal',
    path: '/painel',
    icon: <TrendingUp size={20} />,
    color: 'bg-blue-500',
    type: 'page',
    createdAt: new Date('2024-01-15')
  },
  {
    id: '2',
    title: 'Orçamento #001',
    description: 'Cliente João Silva',
    path: '/orcamento/1',
    icon: <FileText size={20} />,
    color: 'bg-green-500',
    type: 'budget',
    createdAt: new Date('2024-01-14')
  },
  {
    id: '3',
    title: 'Maria Santos',
    description: 'Cliente Premium',
    path: '/cliente/2',
    icon: <Users size={20} />,
    color: 'bg-purple-500',
    type: 'client',
    createdAt: new Date('2024-01-13')
  },
  {
    id: '4',
    title: 'Configurações',
    description: 'Configurações do sistema',
    path: '/configuracoes',
    icon: <Settings size={20} />,
    color: 'bg-gray-500',
    type: 'setting',
    createdAt: new Date('2024-01-12')
  }
];

export const FavoritesSystem: React.FC<FavoritesSystemProps> = ({
  isOpen,
  onClose,
  className = ''
}) => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteItem[]>(initialFavorites);
  const [isEditing, setIsEditing] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Haptic feedback helper
  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [30],
        heavy: [50]
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  // Handle favorite item tap
  const handleItemTap = useCallback((item: FavoriteItem) => {
    if (isEditing) return;
    
    hapticFeedback('light');
    navigate(item.path);
    onClose();
  }, [isEditing, navigate, onClose, hapticFeedback]);

  // Handle long press to enter edit mode
  const handleLongPress = useCallback((itemId: string) => {
    hapticFeedback('heavy');
    setIsEditing(true);
    setDraggedItem(itemId);
  }, [hapticFeedback]);

  // Handle touch start for long press detection
  const handleTouchStart = useCallback((itemId: string) => {
    longPressTimer.current = setTimeout(() => {
      handleLongPress(itemId);
    }, 500); // 500ms for long press
  }, [handleLongPress]);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Remove favorite
  const removeFavorite = useCallback((itemId: string) => {
    hapticFeedback('medium');
    setFavorites(prev => prev.filter(item => item.id !== itemId));
  }, [hapticFeedback]);

  // Reorder favorites
  const handleReorder = useCallback((newOrder: FavoriteItem[]) => {
    setFavorites(newOrder);
  }, []);

  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    setIsEditing(!isEditing);
    setDraggedItem(null);
    hapticFeedback('light');
  }, [isEditing, hapticFeedback]);

  // Add new favorite (placeholder)
  const addFavorite = useCallback(() => {
    hapticFeedback('medium');
    // This would typically open a selection modal
    console.log('Add favorite functionality');
  }, [hapticFeedback]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-50 ${className}`}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Favorites Container */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="
            absolute bottom-0 left-0 right-0
            bg-white/95 backdrop-blur-md
            rounded-t-3xl shadow-2xl
            border-t border-gray-200/50
            max-h-[80vh] overflow-hidden
          "
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <Star size={24} className="mr-2 text-yellow-500" />
                  Favoritos
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {isEditing ? 'Arraste para reordenar' : 'Toque para navegar'}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Add Button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={addFavorite}
                  className="
                    p-2 rounded-full bg-blue-100 text-blue-600
                    hover:bg-blue-200 transition-colors
                  "
                >
                  <Plus size={20} />
                </motion.button>
                
                {/* Edit Button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleEditMode}
                  className={`
                    px-4 py-2 rounded-full font-medium transition-colors
                    ${isEditing 
                      ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  {isEditing ? 'Concluir' : 'Editar'}
                </motion.button>
                
                {/* Close Button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  <X size={20} />
                </motion.button>
              </div>
            </div>
          </div>

          {/* Favorites Grid */}
          <div className="p-6 overflow-y-auto max-h-96">
            {favorites.length > 0 ? (
              <Reorder.Group
                axis="y"
                values={favorites}
                onReorder={handleReorder}
                className="space-y-3"
              >
                {favorites.map((item, index) => (
                  <Reorder.Item
                    key={item.id}
                    value={item}
                    dragListener={isEditing}
                    className="cursor-pointer"
                  >
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      whileTap={!isEditing ? { scale: 0.98 } : {}}
                      onTouchStart={() => !isEditing && handleTouchStart(item.id)}
                      onTouchEnd={handleTouchEnd}
                      onClick={() => handleItemTap(item)}
                      className={`
                        relative p-4 rounded-2xl border-2 transition-all duration-200
                        ${isEditing 
                          ? 'border-blue-200 bg-blue-50/50' 
                          : 'border-gray-200/50 bg-white/50 hover:bg-gray-50/50'
                        }
                        ${draggedItem === item.id ? 'shadow-lg scale-105' : 'shadow-sm'}
                      `}
                    >
                      <div className="flex items-center space-x-4">
                        {/* Drag Handle (Edit Mode) */}
                        {isEditing && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-gray-400 cursor-grab active:cursor-grabbing"
                          >
                            <Grip size={20} />
                          </motion.div>
                        )}
                        
                        {/* Icon */}
                        <div className={`
                          w-12 h-12 rounded-xl flex items-center justify-center
                          text-white ${item.color}
                        `}>
                          {item.icon}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {item.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {item.description}
                          </p>
                        </div>
                        
                        {/* Remove Button (Edit Mode) */}
                        {isEditing && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFavorite(item.id);
                            }}
                            className="
                              p-2 rounded-full bg-red-100 text-red-600
                              hover:bg-red-200 transition-colors
                            "
                          >
                            <Trash2 size={16} />
                          </motion.button>
                        )}
                        
                        {/* Favorite Star */}
                        {!isEditing && (
                          <div className="text-yellow-500">
                            <Star size={20} fill="currentColor" />
                          </div>
                        )}
                      </div>
                      
                      {/* iOS-style selection indicator */}
                      {isEditing && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="
                            absolute -top-2 -right-2
                            w-6 h-6 bg-blue-600 rounded-full
                            flex items-center justify-center
                            border-2 border-white shadow-lg
                          "
                        >
                          <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 0.5, repeat: Infinity }}
                            className="w-2 h-2 bg-white rounded-full"
                          />
                        </motion.div>
                      )}
                    </motion.div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            ) : (
              /* Empty State */
              <div className="text-center py-12">
                <StarOff size={48} className="mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum favorito ainda
                </h3>
                <p className="text-gray-600 mb-6">
                  Adicione páginas aos seus favoritos para acesso rápido
                </p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={addFavorite}
                  className="
                    px-6 py-3 bg-blue-600 text-white rounded-xl
                    font-medium shadow-lg hover:bg-blue-700
                    transition-colors
                  "
                >
                  Adicionar Favorito
                </motion.button>
              </div>
            )}
          </div>
          
          {/* iOS-style Home Indicator */}
          <div className="flex justify-center pb-2">
            <div className="w-32 h-1 bg-gray-300 rounded-full" />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FavoritesSystem;