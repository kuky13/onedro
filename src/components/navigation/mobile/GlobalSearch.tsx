import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Mic, 
  MicOff, 
  X, 
  Clock, 
  TrendingUp,
  FileText,
  Users,
  DollarSign,
  Settings
} from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'budget' | 'client' | 'product' | 'setting' | 'page';
  path: string;
  icon: React.ReactNode;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

// Mock search data - replace with real API calls
const mockSearchResults: SearchResult[] = [
  {
    id: '1',
    title: 'Orçamento #001',
    description: 'Cliente João Silva - R$ 2.500,00',
    type: 'budget',
    path: '/orcamento/1',
    icon: <FileText size={16} />
  },
  {
    id: '2',
    title: 'Maria Santos',
    description: 'Cliente ativo - 5 orçamentos',
    type: 'client',
    path: '/cliente/2',
    icon: <Users size={16} />
  },
  {
    id: '3',
    title: 'Configurações',
    description: 'Configurações do sistema',
    type: 'setting',
    path: '/configuracoes',
    icon: <Settings size={16} />
  },
  {
    id: '4',
    title: 'Dashboard',
    description: 'Painel principal',
    type: 'page',
    path: '/painel',
    icon: <TrendingUp size={16} />
  }
];

const recentSearches = [
  'Orçamento João',
  'Cliente Maria',
  'Configurações',
  'Relatórios'
];

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isOpen,
  onClose,
  className = ''
}) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = 
        window.SpeechRecognition || 
        (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = 'pt-BR';
        
        recognitionInstance.onstart = () => {
          setIsListening(true);
          hapticFeedback('light');
        };
        
        recognitionInstance.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setQuery(transcript);
          hapticFeedback('medium');
        };
        
        recognitionInstance.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          hapticFeedback('heavy');
        };
        
        recognitionInstance.onend = () => {
          setIsListening(false);
        };
        
        setRecognition(recognitionInstance);
      }
    }
  }, []);

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

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Filter mock results
    const filteredResults = mockSearchResults.filter(result =>
      result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setResults(filteredResults);
    setIsLoading(false);
  }, []);

  // Handle search input change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, performSearch]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle voice search
  const handleVoiceSearch = useCallback(() => {
    if (!recognition) {
      alert('Busca por voz não suportada neste navegador');
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  }, [recognition, isListening]);

  // Handle result selection
  const handleResultSelect = useCallback((result: SearchResult) => {
    hapticFeedback('medium');
    navigate(result.path);
    onClose();
    setQuery('');
  }, [navigate, onClose, hapticFeedback]);

  // Handle recent search selection
  const handleRecentSearch = useCallback((searchTerm: string) => {
    setQuery(searchTerm);
    hapticFeedback('light');
  }, [hapticFeedback]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    hapticFeedback('light');
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

        {/* Search Container */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="
            relative bg-white/95 backdrop-blur-md
            mx-4 mt-16 rounded-2xl shadow-2xl
            border border-gray-200/50
            max-h-[80vh] overflow-hidden
          "
        >
          {/* Search Header */}
          <div className="p-4 border-b border-gray-200/50">
            <div className="relative flex items-center space-x-3">
              <Search size={20} className="text-gray-400" />
              
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar orçamentos, clientes, configurações..."
                className="
                  flex-1 bg-transparent border-none outline-none
                  text-gray-900 placeholder-gray-500
                  text-lg
                "
              />
              
              {/* Voice Search Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleVoiceSearch}
                className={`
                  p-2 rounded-full transition-colors
                  ${isListening 
                    ? 'bg-red-100 text-red-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </motion.button>
              
              {/* Clear/Close Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={query ? clearSearch : onClose}
                className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                <X size={18} />
              </motion.button>
            </div>
            
            {/* Voice Recognition Indicator */}
            {isListening && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 flex items-center space-x-2 text-red-600"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-2 h-2 bg-red-600 rounded-full"
                />
                <span className="text-sm">Escutando...</span>
              </motion.div>
            )}
          </div>

          {/* Search Content */}
          <div className="max-h-96 overflow-y-auto">
            {query ? (
              /* Search Results */
              <div className="p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"
                    />
                  </div>
                ) : results.length > 0 ? (
                  <div className="space-y-2">
                    {results.map((result, index) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleResultSelect(result)}
                        className="
                          p-3 rounded-xl bg-gray-50/50 hover:bg-gray-100/50
                          cursor-pointer transition-colors
                          flex items-center space-x-3
                        "
                      >
                        <div className="text-gray-600">
                          {result.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {result.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {result.description}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Search size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Nenhum resultado encontrado</p>
                  </div>
                )}
              </div>
            ) : (
              /* Recent Searches */
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <Clock size={16} className="mr-2" />
                  Buscas Recentes
                </h3>
                <div className="space-y-2">
                  {recentSearches.map((search, index) => (
                    <motion.div
                      key={search}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleRecentSearch(search)}
                      className="
                        p-3 rounded-xl bg-gray-50/50 hover:bg-gray-100/50
                        cursor-pointer transition-colors
                        flex items-center space-x-3
                      "
                    >
                      <Clock size={16} className="text-gray-400" />
                      <span className="text-gray-700">{search}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GlobalSearch;