import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OptimizedNotificationPanel } from '@/components/notifications/OptimizedNotificationPanel';

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-optimized container with safe-area */}
      <div className="w-full max-w-none sm:max-w-7xl sm:mx-auto">
        {/* Sticky header for mobile with safe-area */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/40 pt-safe-top">
          <div className="px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 h-8 sm:h-9 px-2 sm:px-3"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden xs:inline">Voltar</span>
              </Button>
              <h1 className="text-lg sm:text-2xl font-bold truncate">Notificações</h1>
            </div>
          </div>
        </div>
        
        {/* Main content with mobile-optimized padding */}
        <div className="px-0 sm:px-6 pb-safe-bottom">
          <OptimizedNotificationPanel 
            isFullPage={true}
            className="w-full h-[calc(100vh-4rem)] sm:h-auto"
          />
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;