import React from 'react';
import { EnhancedDashboard } from '@/components/dashboard/EnhancedDashboard';

interface ModernDashboardProps {
  onNavigateTo?: (view: string, budgetId?: string) => void;
  activeView?: string;
}

export const ModernDashboard: React.FC<ModernDashboardProps> = (props) => {
  return <EnhancedDashboard {...props} />;
};
