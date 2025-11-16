import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { WormWhatsAppConfig } from './WormWhatsAppConfig';
export const WormHeader = () => {
  const navigate = useNavigate();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const handleBack = () => {
    navigate('/dashboard');
  };
  const handleWhatsAppConfig = () => {
    setIsConfigOpen(true);
  };
  return <header className="relative bg-card border-b border-border/40 backdrop-blur-sm">
      {/* Background decoration removida para tirar o degradê */}
      
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header actions */}
        <div className="mb-4 p-2 bg-background/30 backdrop-blur-sm rounded-xl border border-border/20">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="flex items-center gap-3 px-4 py-2.5 border border-primary/20 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300 ease-in-out text-foreground hover:text-primary rounded-lg font-medium"
            >
              Voltar
            </Button>

            <Button variant="default" size="sm" onClick={handleWhatsAppConfig} className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300 ease-in-out text-foreground hover:text-primary hover:bg-gradient-to-r hover:from-primary/15 hover:to-primary/8 rounded-lg font-medium text-black">
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </Button>
          </div>
        </div>

        {/* Config Sheet */}
        <Sheet open={isConfigOpen} onOpenChange={setIsConfigOpen}>
          <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto pt-16">
            <SheetTitle className="sr-only">Templates WhatsApp</SheetTitle>
            <WormWhatsAppConfig />
          </SheetContent>
        </Sheet>
      </div>
    </header>;
};