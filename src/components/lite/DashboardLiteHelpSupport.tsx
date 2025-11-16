import React, { useState } from 'react';
import { LifeBuoy, MessageCircle, Sparkles, BookOpen, Video, HelpCircle, ArrowRight, Calendar, RefreshCw, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { openWhatsApp } from '@/utils/whatsappUtils';
import { useNavigate } from 'react-router-dom';
import { useUserLicenseDetails } from '@/hooks/useUserLicenseDetails';
export const DashboardLiteHelpSupport = () => {
  const [showLicenseCode, setShowLicenseCode] = useState(false);
  const {
    licenseDetails,
    loading,
    error
  } = useUserLicenseDetails();
  const navigate = useNavigate();
  const handleWhatsAppSupport = () => {
    openWhatsApp('https://wa.me/556496028022');
  };
  const handleRenewLicense = () => {
    const message = licenseDetails?.license_code ? `Olá! Gostaria de renovar minha licença do sistema OneDrip. Código da licença: ${licenseDetails.license_code}` : 'Olá! Gostaria de renovar minha licença do sistema OneDrip.';
    openWhatsApp('556496028022', message);
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };
  const getLicenseStatusColor = () => {
    if (!licenseDetails?.is_valid) return 'text-red-500';
    if (licenseDetails.days_remaining && licenseDetails.days_remaining <= 7) return 'text-yellow-500';
    return 'text-green-500';
  };
  const getLicenseStatusIcon = () => {
    if (!licenseDetails?.is_valid) return <AlertTriangle className="h-5 w-5 text-red-500" />;
    if (licenseDetails.days_remaining && licenseDetails.days_remaining <= 7) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };
  const handleHelpClick = () => {
    navigate('/central-de-ajuda');
  };
  return <>
      <div className="space-y-4">
        {/* Status da Licença */}
        

        {/* Ajuda Rápida */}
        

        {/* Dicas Rápidas */}
        <Card className="border-dashed border-muted-foreground/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
              <h4 className="text-sm font-medium text-foreground">Dicas Rápidas</h4>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                <span>Use a busca para encontrar orçamentos rapidamente</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                <span>Personalize dados da empresa em Configurações</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                <span>Compartilhe orçamentos com um clique no WhatsApp</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Link de Suporte WhatsApp */}
        
      </div>


    </>;
};