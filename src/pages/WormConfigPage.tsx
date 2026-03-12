// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WormHeader } from '@/components/worm/WormHeader';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, FileText, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
export const WormConfigPage = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  if (!user) return null; // Or unauthorized redirect

  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
            <WormHeader />
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-8">
                <h1 className="text-3xl font-bold">Configurações</h1>
                <p className="text-muted-foreground">Personalize a geração de mensagens.</p>

                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-green-500" onClick={() => navigate('/worm/config/whatsapp')}>
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-100 rounded-full dark:bg-green-900/20">
                                    <MessageSquare className="h-8 w-8 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold">WhatsApp</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Templates de mensagens, variáveis e formatação.
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="h-6 w-6 text-muted-foreground" />
                        </CardContent>
                    </Card>

                    














        
                </div>
            </main>
        </div>;
};
export default WormConfigPage;