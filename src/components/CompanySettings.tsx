
// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import { LogoUploadZone } from '@/components/logo/LogoUploadZone';
import { Building2, Save } from 'lucide-react';

export const CompanySettings = () => {
  const { 
    companyInfo, 
    loading, 
    updateCompanyInfo, 
    uploadLogo
  } = useCompanyBranding();
  
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    address: '',
    whatsapp_phone: '',
    email: ''
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (companyInfo) {
      setFormData({
        name: companyInfo.name || '',
        cnpj: companyInfo.cnpj || '',
        address: companyInfo.address || '',
        whatsapp_phone: companyInfo.whatsapp_phone || '',
        email: companyInfo.email || ''
      });
    }
  }, [companyInfo]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateCompanyInfo(formData);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatCNPJ = (value: string) => {
    // Remove non-numeric characters
    const numeric = value.replace(/\D/g, '');
    
    // Apply CNPJ mask: XX.XXX.XXX/XXXX-XX
    if (numeric.length <= 14) {
      return numeric.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        '$1.$2.$3/$4-$5'
      );
    }
    
    return numeric.substring(0, 14).replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    );
  };

  const handleCNPJChange = (value: string) => {
    const formatted = formatCNPJ(value);
    handleInputChange('cnpj', formatted);
  };

  const formatPhone = (value: string) => {
    const numeric = value.replace(/\D/g, '');
    if (numeric.length <= 11) {
      return numeric.replace(
        /^(\d{2})(\d{5})(\d{4})$/,
        '($1) $2-$3'
      );
    }
    return numeric.substring(0, 11).replace(
      /^(\d{2})(\d{5})(\d{4})$/,
      '($1) $2-$3'
    );
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    handleInputChange('whatsapp_phone', formatted);
  };

  const handleLogoUpload = (file: File) => {
    return uploadLogo(file);
  };

  const handleRemoveLogo = () => {
    return updateCompanyInfo({ logo_url: '' });
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Building2 className="h-5 w-5 mr-2 text-primary" />
            Informações da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-10 bg-muted rounded"></div>
            </div>
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-10 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card animate-scale-in">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Building2 className="h-5 w-5 mr-2 text-primary" />
          Informações da Empresa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Logo Section */}
        <div className="space-y-2">
          <Label>Logo da Empresa</Label>
          <LogoUploadZone
            currentLogoUrl={companyInfo?.logo_url ?? ''}
            onUpload={handleLogoUpload}
            onRemove={handleRemoveLogo}
            isUploading={false}
            isRemoving={false}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Nome da Empresa</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Nome da sua empresa"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input
            id="cnpj"
            value={formData.cnpj}
            onChange={(e) => handleCNPJChange(e.target.value)}
            placeholder="00.000.000/0000-00"
            maxLength={18}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="address">Endereço</Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Endereço completo da empresa"
            rows={3}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="whatsapp_phone">WhatsApp</Label>
          <Input
            id="whatsapp_phone"
            value={formData.whatsapp_phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="(11) 99999-9999"
            maxLength={15}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="contato@empresa.com"
          />
        </div>
        
        <Button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar Informações'}
        </Button>
      </CardContent>
    </Card>
  );
};
