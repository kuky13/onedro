import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Mic, 
  MicOff, 
  Command, 
  ArrowRight,
  Clock,
  Star,
  X
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'navigation' | 'action' | 'recent' | 'favorite';
  keywords: string[];
}

interface MobileCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const MobileCommandPalette: React.FC<MobileCommandPaletteProps> = ({
  isOpen,
  onClose,
  className = ''
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<CommandItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Command definitions
  const commands: CommandItem[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Ir para o painel principal',
      icon: <Search size={18} />,
      action: () => navigate('/painel'),
      category: 'navigation',
      keywords: ['dashboard', 'painel', 'início', 'home']
    },
    {
      id: 'budgets',
      title: 'Orçamentos',
      description: 'Ver todos os orçamentos',
      icon: <Search size={18} />,
      action: () => navigate('/orcamentos'),
      category: 'navigation',
      keywords: ['orçamentos', 'budgets', 'propostas']
    },
    {
      id: 'clients',
      title: 'Clientes',
      description: 'Gerenciar clientes',
      icon: <Search size={18} />,
      action: () => navigate('/clientes'),
      category: 'navigation',
      keywords: ['clientes', 'clients', 'customers']
    },
    {
      id: 'settings',
      title: 'Configurações',
      description: 'Ajustar preferências',
      icon: <Search size={18} />,
      action: () => navigate('/configuracoes'),
      category: 'navigation',
      keywords: ['configurações', 'settings', 'config']
    }
  ];

  // Initialize speech recognition for Safari
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = 
        (window as any).SpeechRecognition || 
        (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'pt-BR';
        
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setQuery(transcript);
          setIsListening(false);
        };
        
        recognitionRef.current.onerror = () => {
          setIsListening(false);
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  // Filter commands based on query
  useEffect(() => {
    if (!query.trim()) {
      setFilteredCommands(commands.slice(0, 6));
    } else {
      const filtered = commands.filter(command => 
        command.keywords.some(keyword => 
          keyword.toLowerCase().includes(query.toLowerCase())
        ) ||
        command.title.toLowerCase().includes(query.toLowerCase()) ||
        command.description?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredCommands(filtered);
    }
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const startVoiceSearch = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50]);
      }
    }
  };

  const stopVoiceSearch = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const executeCommand = (command: CommandItem) => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([10]);
    }
    
    command.action();
    onClose();
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
          onClick={onClose}
        >
          {/* Backdrop with iOS blur */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className={`
              w-full max-w-lg bg-white/95 backdrop-blur-xl
              rounded-2xl shadow-2xl border border-gray-200/50
              overflow-hidden ${className}
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200/50">
              <div className="flex items-center space-x-2">
                <Command size={20} className="text-blue-600" />
                <span className="font-semibold text-gray-900">Busca Rápida</span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            
            {/* Search Input */}
            <div className="p-4 border-b border-gray-200/50">
              <div className="relative flex items-center">
                <Search size={18} className="absolute left-3 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite ou fale o que procura..."
                  className="
                    w-full pl-10 pr-12 py-3 bg-gray-50 rounded-xl
                    border-none outline-none text-gray-900
                    placeholder-gray-500 text-base
                  "
                  inputMode="search"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
                
                {/* Voice Search Button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={isListening ? stopVoiceSearch : startVoiceSearch}
                  className={`
                    absolute right-2 p-2 rounded-lg transition-colors
                    ${isListening 
                      ? 'bg-red-500 text-white' 
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                    }
                  `}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </motion.button>
              </div>
              
              {/* Voice indicator */}
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 flex items-center justify-center space-x-1"
                >
                  <div className="flex space-x-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{
                          scaleY: [1, 2, 1],
                          opacity: [0.5, 1, 0.5]
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.1
                        }}
                        className="w-1 h-3 bg-red-500 rounded-full"
                      />
                    ))}
                  </div>
                  <span className="text-sm text-red-600 ml-2">Ouvindo...</span>
                </motion.div>
              )}
            </div>
            
            {/* Commands List */}
            <div className="max-h-80 overflow-y-auto">
              {filteredCommands.length > 0 ? (
                filteredCommands.map((command, index) => (
                  <motion.button
                    key={command.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => executeCommand(command)}
                    className={`
                      w-full flex items-center space-x-3 p-4 text-left
                      transition-colors duration-150
                      ${index === selectedIndex 
                        ? 'bg-blue-50 border-r-2 border-blue-500' 
                        : 'hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className={`
                      p-2 rounded-lg
                      ${index === selectedIndex ? 'bg-blue-100' : 'bg-gray-100'}
                    `}>
                      {command.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">
                        {command.title}
                      </div>
                      {command.description && (
                        <div className="text-sm text-gray-500 truncate">
                          {command.description}
                        </div>
                      )}
                    </div>
                    
                    <ArrowRight size={16} className="text-gray-400" />
                  </motion.button>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Search size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Nenhum resultado encontrado</p>
                  <p className="text-sm mt-1">Tente usar outros termos</p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-3 bg-gray-50/50 border-t border-gray-200/50">
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                <span className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-white rounded border text-xs">↑↓</kbd>
                  <span>Navegar</span>
                </span>
                <span className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-white rounded border text-xs">↵</kbd>
                  <span>Selecionar</span>
                </span>
                <span className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-white rounded border text-xs">esc</kbd>
                  <span>Fechar</span>
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileCommandPalette;