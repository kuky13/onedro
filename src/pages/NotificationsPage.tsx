import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OptimizedNotificationPanel } from '@/components/notifications/OptimizedNotificationPanel';

const NotificationsPage = () => {
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
        <main className="px-0 sm:px-6 pb-safe-bottom pt-2 sm:pt-4 flex flex-col sm:block">
          {/* Mobile full-page panel */}
          <div className="sm:hidden">
            <OptimizedNotificationPanel
              isFullPage
              className="w-full h-full"
            />
          </div>

          {/* Desktop / tablet card layout */}
          <div className="hidden sm:block max-w-4xl mx-auto">
            <Card className="shadow-md border-border/60 bg-card/95 backdrop-blur-sm">
              <CardContent className="p-0">
                <OptimizedNotificationPanel
                  isFullPage
                  className="w-full h-[600px]"
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default NotificationsPage;