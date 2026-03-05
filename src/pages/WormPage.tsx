// @ts-nocheck
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { WormBudgetList } from '@/components/worm/WormBudgetList';
import { WormHeader } from '@/components/worm/WormHeader';

export const WormPage = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 rounded-2xl border border-border/50 bg-card backdrop-blur-sm">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5C3.312 18.167 4.852 19.834 6.392 19.834z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground">Faça login para acessar o sistema exclusivo de orçamentos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <WormHeader />
        <main className="py-6 lg:py-10 space-y-6 lg:space-y-10">
          <WormBudgetList userId={user.id} />
        </main>
      </div>
    </div>
  );
};

export default WormPage;
