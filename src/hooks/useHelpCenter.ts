import { useState, useEffect, useMemo, useRef } from 'react';
import { useToast } from '@/hooks/useToast';
import { helpSections, faqItems, HelpSection, FAQItem } from '@/pages/help-center/helpCenterData';

interface SearchHistory {
  id: string;
  query: string;
  timestamp: Date;
  results: number;
}

interface Feedback {
  id: string;
  type: 'helpful' | 'not-helpful';
  contentId: string;
  comment?: string;
}

export function useHelpCenter() {
  const { showSuccess } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [openSections, setOpenSections] = useState<string[]>(['budgets']);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [showFeedbackForm, setShowFeedbackForm] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [activeTab, setActiveTab] = useState('search');
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>({});

  const sectionsRef = useRef<HelpSection[]>(helpSections);
  const faqRef = useRef<FAQItem[]>(faqItems);

  useEffect(() => {
    const savedHistory = localStorage.getItem('help_search_history');
    if (savedHistory) {
      try { setSearchHistory(JSON.parse(savedHistory)); } catch { /* ignore */ }
    }
    const savedFeedback = localStorage.getItem('help_feedback');
    if (savedFeedback) {
      try {
        const feedbacks: Feedback[] = JSON.parse(savedFeedback);
        const counts: Record<string, number> = {};
        feedbacks.forEach((f) => {
          if (f.type === 'helpful') counts[f.contentId] = (counts[f.contentId] || 0) + 1;
        });
        setHelpfulCounts(counts);
      } catch { /* ignore */ }
    }
  }, []);

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  const saveSearchHistory = (query: string, results: number) => {
    if (query.length < 2) return;
    const newHistory: SearchHistory = { id: Date.now().toString(), query, timestamp: new Date(), results };
    const updated = [newHistory, ...searchHistory].slice(0, 10);
    setSearchHistory(updated);
    localStorage.setItem('help_search_history', JSON.stringify(updated));
  };

  const saveFeedback = (contentId: string, type: 'helpful' | 'not-helpful', comment?: string) => {
    const newFeedback: Feedback = { id: Date.now().toString(), type, contentId, ...(comment ? { comment } : {}) };
    const saved = localStorage.getItem('help_feedback') || '[]';
    const feedbacks = JSON.parse(saved);
    feedbacks.push(newFeedback);
    localStorage.setItem('help_feedback', JSON.stringify(feedbacks.slice(-50)));
    if (type === 'helpful') {
      setHelpfulCounts((prev) => ({ ...prev, [contentId]: (prev[contentId] || 0) + 1 }));
    }
    showSuccess({ title: type === 'helpful' ? 'Obrigado pelo feedback!' : 'Sua opinião nos ajuda a melhorar!' });
    setShowFeedbackForm(null);
    setFeedbackComment('');
  };

  const searchSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    const allTerms = [
      ...sectionsRef.current.flatMap((s) => [s.title, s.description]),
      ...faqRef.current.flatMap((f) => [f.question, f.answer]),
    ];
    return [...new Set(allTerms.filter((term) => term.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5))];
  }, [searchTerm]);

  const filteredSections = useMemo(() => {
    return helpSections.filter((section) => {
      const matchesSearch =
        section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch && (selectedCategory === 'all' || section.id === selectedCategory);
    });
  }, [searchTerm, selectedCategory]);

  const filteredFAQ = useMemo(() => {
    return faqItems.filter((item) => {
      const matchesSearch =
        item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch && (selectedCategory === 'all' || item.category === selectedCategory);
    });
  }, [searchTerm, selectedCategory]);

  const handleSearch = (query: string) => {
    setSearchTerm(query);
    if (query.length >= 2) {
      const results = filteredSections.length + filteredFAQ.length;
      saveSearchHistory(query, results);
    }
  };

  return {
    searchTerm,
    selectedCategory,
    setSelectedCategory,
    openSections,
    toggleSection,
    searchHistory,
    showFeedbackForm,
    setShowFeedbackForm,
    feedbackComment,
    setFeedbackComment,
    activeTab,
    setActiveTab,
    helpfulCounts,
    searchSuggestions,
    filteredSections,
    filteredFAQ,
    handleSearch,
    saveFeedback,
  };
}
