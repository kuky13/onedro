import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Key, 
  Plus, 
  BarChart3, 
  Settings, 
  RefreshCw, 
  Download,
  Loader2,
  Gift,
  Wrench,
  Database,
  Trash2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useAdminLicense } from '@/hooks/useAdminLicense';
import { useTrialLicense } from '@/hooks/useTrialLicense';
import { toast } from 'sonner';

export const AdminLicenseManager = () => {
  const [selectedTab, setSelectedTab] = useState('create');
  const [createForm, setCreateForm] = useState({
    days: 30,
    quantity: 1,
    description: ''
  });
  const [mixedLicenses, setMixedLicenses] = useState([
    { days: 30, quantity: 1 }
  ]);
  const [convertForm, setConvertForm] = useState({
    license_code: '',
    new_days: 30
  });
  const [trialUserId, setTrialUserId] = useState('');
  const [createdLicenses, setCreatedLicenses] = useState<string[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [cleanupLogs, setCleanupLogs] = useState<any[]>([]);

  const {
    isLoading: isAdminLoading,
    createLicenseWithDays,
    createMixedLicenses,
    getLicenseStatsByDays,
    convertLegacyLicense,
    createTrialForUser,
    repairMissingTrialLicenses,
    getDatabaseStats,
    optimizeDatabase,
    manualLicenseCleanup,
    getLicenseCleanupLogs
  } = useAdminLicense();

  const {
    getTrialStatistics,
    cleanupExpiredTrialLicenses,
    isLoading: isTrialLoading
  } = useTrialLicense();

  const loadStats = async () => {
    try {
      const [licenseStats, trialStats, cleanupLogsData] = await Promise.all([
        getLicenseStatsByDays(),
        getTrialStatistics(),
        getLicenseCleanupLogs()
      ]);
      setStats({ license: licenseStats, trial: trialStats });
      setCleanupLogs(cleanupLogsData);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleCreateLicense = async () => {
    try {
      const licenses = await createLicenseWithDays(createForm);
      setCreatedLicenses(licenses);
      setCreateForm({ days: 30, quantity: 1, description: '' });
      await loadStats();
    } catch (error) {
      console.error('Erro ao criar licenças:', error);
    }
  };

  const handleCreateMixedLicenses = async () => {
    try {
      const licenses = await createMixedLicenses({
        licenses: mixedLicenses,
        description: createForm.description
      });
      setCreatedLicenses(licenses);
      setMixedLicenses([{ days: 30, quantity: 1 }]);
      await loadStats();
    } catch (error) {
      console.error('Erro ao criar licenças mistas:', error);
    }
  };

  const handleConvertLicense = async () => {
    try {
      const newCode = await convertLegacyLicense(convertForm);
      setCreatedLicenses([newCode]);
      setConvertForm({ license_code: '', new_days: 30 });
      await loadStats();
    } catch (error) {
      console.error('Erro ao converter licença:', error);
    }
  };

  const handleCreateTrialForUser = async () => {
    try {
      const trialCode = await createTrialForUser(trialUserId);
      setCreatedLicenses([trialCode]);
      setTrialUserId('');
      await loadStats();
    } catch (error) {
      console.error('Erro ao criar licença de teste:', error);
    }
  };

  const handleRepairTrialLicenses = async () => {
    try {
      await repairMissingTrialLicenses();
      await loadStats();
    } catch (error) {
      console.error('Erro ao reparar licenças:', error);
    }
  };

  const handleCleanupTrialLicenses = async () => {
    try {
      await cleanupExpiredTrialLicenses();
      await loadStats();
      toast.success('Limpeza de licenças de teste concluída');
    } catch (error) {
      console.error('Erro na limpeza:', error);
    }
  };

  const handleOptimizeDatabase = async () => {
    try {
      await optimizeDatabase();
      await loadStats();
    } catch (error) {
      console.error('Erro ao otimizar banco:', error);
    }
  };

  const handleManualCleanup = async () => {
    try {
      await manualLicenseCleanup();
      await loadStats();
    } catch (error) {
      console.error('Erro na limpeza manual:', error);
    }
  };

  const addMixedLicense = () => {
    setMixedLicenses([...mixedLicenses, { days: 30, quantity: 1 }]);
  };

  const removeMixedLicense = (index: number) => {
    setMixedLicenses(mixedLicenses.filter((_, i) => i !== index));
  };

  const updateMixedLicense = (index: number, field: 'days' | 'quantity', value: number) => {
    const updated = [...mixedLicenses];
    updated[index][field] = value;
    setMixedLicenses(updated);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Código copiado para a área de transferência');
  };

  const downloadLicenses = () => {
    const content = createdLicenses.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `licencas_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciador de Licenças</h1>
          <p className="text-muted-foreground">
            Administre licenças, estatísticas e configurações do sistema
          </p>
        </div>
        <Button onClick={loadStats} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas Rápidas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Key className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total de Licenças</p>
                  <p className="text-2xl font-bold">{stats.license?.total_licenses || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Gift className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Licenças Ativas</p>
                  <p className="text-2xl font-bold">{stats.license?.active_licenses || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Licenças de Teste</p>
                  <p className="text-2xl font-bold">{stats.trial?.total_trial_licenses || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Licenças Legadas</p>
                  <p className="text-2xl font-bold">{stats.license?.legacy_licenses || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="create">Criar Licenças</TabsTrigger>
          <TabsTrigger value="mixed">Licenças Mistas</TabsTrigger>
          <TabsTrigger value="trial">Licenças de Teste</TabsTrigger>
          <TabsTrigger value="convert">Converter Legadas</TabsTrigger>
          <TabsTrigger value="cleanup">Limpeza Automática</TabsTrigger>
          <TabsTrigger value="maintenance">Manutenção</TabsTrigger>
        </TabsList>

        {/* Criar Licenças Simples */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Criar Licenças com Dias Específicos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Dias de Validade</label>
                  <Input
                    type="number"
                    min="1"
                    max="3650"
                    value={createForm.days}
                    onChange={(e) => setCreateForm({
                      ...createForm,
                      days: parseInt(e.target.value) || 30
                    })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Quantidade</label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={createForm.quantity}
                    onChange={(e) => setCreateForm({
                      ...createForm,
                      quantity: parseInt(e.target.value) || 1
                    })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição (Opcional)</label>
                  <Input
                    placeholder="Ex: Licenças promocionais"
                    value={createForm.description}
                    onChange={(e) => setCreateForm({
                      ...createForm,
                      description: e.target.value
                    })}
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleCreateLicense}
                disabled={isAdminLoading}
                className="w-full"
              >
                {isAdminLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando Licenças...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar {createForm.quantity} Licença(s) de {createForm.days} Dias
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Licenças Mistas */}
        <TabsContent value="mixed">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Criar Licenças com Diferentes Durações</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mixedLicenses.map((license, index) => (
                <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg">
                  <div className="flex-1">
                    <label className="text-sm font-medium">Dias</label>
                    <Input
                      type="number"
                      min="1"
                      max="3650"
                      value={license.days}
                      onChange={(e) => updateMixedLicense(index, 'days', parseInt(e.target.value) || 30)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium">Quantidade</label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={license.quantity}
                      onChange={(e) => updateMixedLicense(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  {mixedLicenses.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeMixedLicense(index)}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              ))}
              
              <div className="flex space-x-2">
                <Button variant="outline" onClick={addMixedLicense}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Tipo
                </Button>
                <Button 
                  onClick={handleCreateMixedLicenses}
                  disabled={isAdminLoading}
                  className="flex-1"
                >
                  {isAdminLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Licenças Mistas'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Licenças de Teste */}
        <TabsContent value="trial">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Gift className="h-5 w-5" />
                <span>Gerenciar Licenças de Teste</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">ID do Usuário</label>
                <Input
                  placeholder="UUID do usuário"
                  value={trialUserId}
                  onChange={(e) => setTrialUserId(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Button 
                  onClick={handleCreateTrialForUser}
                  disabled={isAdminLoading || !trialUserId.trim()}
                >
                  {isAdminLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Gift className="h-4 w-4 mr-2" />
                  )}
                  Criar Teste
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleRepairTrialLicenses}
                  disabled={isAdminLoading}
                >
                  {isAdminLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Wrench className="h-4 w-4 mr-2" />
                  )}
                  Reparar Faltantes
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleCleanupTrialLicenses}
                  disabled={isTrialLoading}
                >
                  {isTrialLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Limpar Expiradas
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Converter Licenças Legadas */}
        <TabsContent value="convert">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Converter Licenças Legadas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Código da Licença Legada</label>
                  <Input
                    placeholder="Código antigo de 13 caracteres"
                    value={convertForm.license_code}
                    onChange={(e) => setConvertForm({
                      ...convertForm,
                      license_code: e.target.value.toUpperCase()
                    })}
                    maxLength={13}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Novos Dias</label>
                  <Input
                    type="number"
                    min="1"
                    max="3650"
                    value={convertForm.new_days}
                    onChange={(e) => setConvertForm({
                      ...convertForm,
                      new_days: parseInt(e.target.value) || 30
                    })}
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleConvertLicense}
                disabled={isAdminLoading || convertForm.license_code.length !== 13}
                className="w-full"
              >
                {isAdminLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Convertendo...
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    Converter Licença
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Limpeza Automática */}
        <TabsContent value="cleanup">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trash2 className="h-5 w-5" />
                  <span>Limpeza Automática de Licenças</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2 flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Sistema Automático
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      O sistema executa limpeza automática de licenças expiradas:
                    </p>
                    <ul className="text-sm space-y-1">
                      <li>• Licenças de teste expiradas há mais de 7 dias são removidas</li>
                      <li>• Licenças normais expiradas são desativadas automaticamente</li>
                      <li>• Limpeza completa executada diariamente às 3:00 AM</li>
                      <li>• Verificação de expiradas a cada 6 horas</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2 flex items-center">
                      <Wrench className="h-4 w-4 mr-2" />
                      Limpeza Manual
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Execute limpeza manual quando necessário:
                    </p>
                    <Button 
                      onClick={handleManualCleanup}
                      disabled={isAdminLoading}
                      className="w-full"
                    >
                      {isAdminLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Executando Limpeza...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Executar Limpeza Manual
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logs de Limpeza */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Histórico de Limpeza</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cleanupLogs.length > 0 ? (
                  <div className="space-y-3">
                    {cleanupLogs.slice(0, 10).map((log, index) => (
                      <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${
                            log.cleanup_type === 'TRIAL_CLEANUP' ? 'bg-blue-100 text-blue-600' :
                            log.cleanup_type === 'EXPIRED_CLEANUP' ? 'bg-orange-100 text-orange-600' :
                            'bg-green-100 text-green-600'
                          }`}>
                            {log.cleanup_type === 'TRIAL_CLEANUP' ? <Gift className="h-4 w-4" /> :
                             log.cleanup_type === 'EXPIRED_CLEANUP' ? <AlertTriangle className="h-4 w-4" /> :
                             <Wrench className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="font-medium">
                              {log.cleanup_type === 'TRIAL_CLEANUP' ? 'Limpeza de Teste' :
                               log.cleanup_type === 'EXPIRED_CLEANUP' ? 'Limpeza de Expiradas' :
                               'Limpeza Manual'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(log.cleanup_date).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {log.deleted_count} removidas, {log.updated_count} desativadas
                          </p>
                          {log.execution_time_ms && (
                            <p className="text-xs text-muted-foreground">
                              {log.execution_time_ms}ms
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum log de limpeza encontrado
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Manutenção */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Manutenção do Sistema</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline"
                  onClick={handleOptimizeDatabase}
                  disabled={isAdminLoading}
                >
                  {isAdminLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Database className="h-4 w-4 mr-2" />
                  )}
                  Otimizar Banco
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleManualCleanup}
                  disabled={isAdminLoading}
                >
                  {isAdminLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Limpeza Manual
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={loadStats}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recarregar Dados
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Licenças Criadas */}
      {createdLicenses.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Licenças Criadas</CardTitle>
              <Button variant="outline" size="sm" onClick={downloadLicenses}>
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {createdLicenses.map((license, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-muted"
                  onClick={() => copyToClipboard(license)}
                >
                  <code className="font-mono text-sm">{license}</code>
                  <Badge variant="secondary">
                    {license.startsWith('TRIAL') ? 'Teste' : 'Normal'}
                  </Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Clique em uma licença para copiar para a área de transferência
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};