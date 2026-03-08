/**
 * Componente de ações para ordens de serviço criadas a partir de orçamentos
 * Mostra atalhos para visualização e edição quando ordem já existe
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ExternalLink,
  Edit,
  Share,
  CheckCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useServiceOrderShare, buildFormattedShareUrl } from '@/hooks/useServiceOrderShare';

interface ServiceOrderActionsProps {
  createdOrderId: string;
  formattedId?: string | null;
  sequentialNumber?: number | null;
  compact?: boolean;
}

export const ServiceOrderActions = ({
  createdOrderId,
  formattedId,
  sequentialNumber,
  compact = false
}: ServiceOrderActionsProps) => {
  const navigate = useNavigate();
  const { generateShareToken, isGenerating } = useServiceOrderShare();

  const handleViewShare = async () => {
    // Try permanent URL first
    const permanentUrl = buildFormattedShareUrl(sequentialNumber);
    if (permanentUrl) {
      window.open(permanentUrl.replace(window.location.origin, ''), '_blank');
      return;
    }
    // Fallback to token-based
    const shareData = await generateShareToken(createdOrderId);
    if (shareData) {
      window.open(shareData.share_url.replace(window.location.origin, ''), '_blank');
    }
  };

  const handleEdit = () => {
    navigate(`/service-orders/${createdOrderId}/edit`);
  };

  const displayId = formattedId || `OS-${createdOrderId.slice(-8)}`;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          OS Criada
        </Badge>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleViewShare}
            disabled={isGenerating}
            className="h-7 px-2 text-xs"
          >
            <Share className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleEdit}
            className="h-7 px-2 text-xs"
          >
            <Edit className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Ordem de Serviço Criada
              </span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-300">
              ID: {displayId}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleViewShare}
              disabled={isGenerating}
              className="text-green-700 border-green-300 hover:bg-green-100"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              {isGenerating ? 'Gerando...' : 'Compartilhar'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEdit}
              className="text-green-700 border-green-300 hover:bg-green-100"
            >
              <Edit className="h-3 w-3 mr-1" />
              Editar
            </Button>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-green-200">
          <p className="text-xs text-green-600 dark:text-green-300">
            ✓ Link de compartilhamento público disponível<br/>
            ✓ Ordem pode ser editada e gerenciada
          </p>
        </div>
      </CardContent>
    </Card>
  );
};