// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WormTrash } from '@/components/worm/WormTrash';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function WormTrashPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBackToWorm = () => {
    navigate('/worm');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Lixeira"
          description="Gerencie orçamentos excluídos"
          icon={<Trash2 className="h-6 w-6" />}
        />
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToWorm}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Worm
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Orçamentos Excluídos
          </CardTitle>
          <CardDescription>
            Visualize, restaure ou exclua permanentemente orçamentos da lixeira.
            <br />
            <strong>Atenção:</strong> Exclusões permanentes não podem ser desfeitas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WormTrash userId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}