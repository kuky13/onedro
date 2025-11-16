import React, { useState } from 'react';
import { 
  Bell, 
  Send, 
  Users, 
  User, 
  Shield, 
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Eye,
  Trash2,
  Filter,
  Search,
  Download
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/useToast';
import { usePushAdmin } from '@/hooks/usePushAdmin';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  color = 'blue' 
}) => {
  const colorClasses = {
    blue: {
      gradient: 'from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10',
      border: 'border-blue-200/50 dark:border-blue-800/30',
      icon: 'from-blue-500 to-blue-600',
      shadow: 'shadow-blue-500/25'
    },
    green: {
      gradient: 'from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10',
      border: 'border-green-200/50 dark:border-green-800/30',
      icon: 'from-green-500 to-green-600',
      shadow: 'shadow-green-500/25'
    },
    yellow: {
      gradient: 'from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10',
      border: 'border-orange-200/50 dark:border-orange-800/30',
      icon: 'from-orange-500 to-orange-600',
      shadow: 'shadow-orange-500/25'
    },
    red: {
      gradient: 'from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10',
      border: 'border-red-200/50 dark:border-red-800/30',
      icon: 'from-red-500 to-red-600',
      shadow: 'shadow-red-500/25'
    }
  };

  const colorClass = colorClasses[color];

  return (
    <motion.div
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorClass.gradient} border ${colorClass.border} p-6 hover:shadow-xl transition-all duration-300`}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="relative space-y-4">
        <div className="flex items-center justify-between">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass.icon} flex items-center justify-center shadow-lg ${colorClass.shadow}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground mb-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          <p className="text-sm font-medium text-foreground mb-1">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </motion.div>
  );
};

interface SendNotificationFormProps {
  onSend: (data: any) => void;
  isLoading: boolean;
  activeUsers: any[];
}

const SendNotificationForm: React.FC<SendNotificationFormProps> = ({ onSend, isLoading, activeUsers }) => {
  const [formData, setFormData] = useState({
    target_type: 'all',
    target_user_id: '',
    target_role: '',
    title: '',
    body: '',
    url: '',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    silent: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.body) return;
    
    onSend(formData);
    setFormData({
      ...formData,
      title: '',
      body: '',
      url: ''
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="target_type">Destinatários</Label>
          <Select 
            value={formData.target_type} 
            onValueChange={(value) => setFormData({ ...formData, target_type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione os destinatários" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os usuários</SelectItem>
              <SelectItem value="role">Por função</SelectItem>
              <SelectItem value="user">Usuário específico</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.target_type === 'role' && (
          <div className="space-y-2">
            <Label htmlFor="target_role">Função</Label>
            <Select 
              value={formData.target_role} 
              onValueChange={(value) => setFormData({ ...formData, target_role: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administradores</SelectItem>
                <SelectItem value="manager">Gerentes</SelectItem>
                <SelectItem value="user">Usuários</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {formData.target_type === 'user' && (
          <div className="space-y-2">
            <Label htmlFor="target_user_id">Usuário</Label>
            <Select 
              value={formData.target_user_id} 
              onValueChange={(value) => setFormData({ ...formData, target_user_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o usuário" />
              </SelectTrigger>
              <SelectContent>
                {activeUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.email} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Título da notificação"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Mensagem</Label>
        <Textarea
          id="body"
          value={formData.body}
          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          placeholder="Conteúdo da notificação"
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">URL (opcional)</Label>
        <Input
          id="url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="URL para redirecionamento"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="silent"
          checked={formData.silent}
          onCheckedChange={(checked) => setFormData({ ...formData, silent: checked })}
        />
        <Label htmlFor="silent">Notificação silenciosa</Label>
      </div>

      <Button type="submit" disabled={isLoading || !formData.title || !formData.body} className="w-full">
        {isLoading ? (
          <>
            <LoadingSpinner className="mr-2 h-4 w-4" />
            Enviando...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Enviar Notificação
          </>
        )}
      </Button>
    </form>
  );
};

export const PushNotificationPanel: React.FC = () => {
  const { 
    notificationStats, 
    notificationHistory, 
    activeUsers,
    isLoadingStats, 
    isLoadingHistory, 
    isLoadingUsers,
    sendPushNotification,
    sendTestNotification,
    getNotificationLogs,
    isLoading
  } = usePushAdmin();

  const { showSuccess } = useToast();
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const handleSendNotification = async (data: any) => {
    try {
      await sendPushNotification(data);
      showSuccess({ title: 'Notificação enviada com sucesso!' });
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
    }
  };

  const handleSendTest = async () => {
    try {
      await sendTestNotification({
        title: 'Teste de Notificação',
        body: 'Esta é uma notificação de teste do painel administrativo.',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png'
      });
    } catch (error) {
      console.error('Erro ao enviar teste:', error);
    }
  };

  const handleViewLogs = async (notificationId: string) => {
    setIsLoadingLogs(true);
    try {
      const logs = await getNotificationLogs(notificationId);
      setNotificationLogs(logs);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Entregue</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Falhou</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTargetBadge = (targetType: string, targetRole?: string) => {
    switch (targetType) {
      case 'all':
        return <Badge variant="default"><Users className="w-3 h-3 mr-1" />Todos</Badge>;
      case 'role':
        return <Badge variant="secondary"><Shield className="w-3 h-3 mr-1" />{targetRole}</Badge>;
      case 'user':
        return <Badge variant="outline"><User className="w-3 h-3 mr-1" />Usuário</Badge>;
      default:
        return <Badge variant="outline">{targetType}</Badge>;
    }
  };

  if (isLoadingStats || isLoadingHistory || isLoadingUsers) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-orange-500/5 rounded-3xl blur-3xl" />
        <div className="relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Notificações Push
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Gerencie e envie notificações push para os usuários
              </p>
            </div>
            <Button onClick={handleSendTest} variant="outline" className="ml-4">
              <Bell className="mr-2 h-4 w-4" />
              Enviar Teste
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Estatísticas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatCard
          title="Total Enviadas"
          value={notificationStats?.total_sent || 0}
          description="Notificações enviadas"
          icon={Send}
          color="blue"
        />
        <StatCard
          title="Entregues"
          value={notificationStats?.total_delivered || 0}
          description="Notificações entregues"
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Falharam"
          value={notificationStats?.total_failed || 0}
          description="Notificações com falha"
          icon={XCircle}
          color="red"
        />
        <StatCard
          title="Taxa de Entrega"
          value={`${notificationStats?.delivery_rate || 0}%`}
          description="Taxa de sucesso"
          icon={BarChart3}
          color="yellow"
        />
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Tabs defaultValue="send" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="send">Enviar Notificação</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="mr-2 h-5 w-5" />
                  Nova Notificação
                </CardTitle>
                <CardDescription>
                  Envie notificações push para usuários específicos ou grupos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SendNotificationForm
                  onSend={handleSendNotification}
                  isLoading={isLoading}
                  activeUsers={activeUsers || []}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Histórico de Notificações
                </CardTitle>
                <CardDescription>
                  Visualize todas as notificações enviadas e suas estatísticas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {notificationHistory?.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{notification.title}</h4>
                          {getTargetBadge(notification.target_type, notification.target_role)}
                        </div>
                        <p className="text-sm text-muted-foreground">{notification.body}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>
                            {format(new Date(notification.created_at), 'dd/MM/yyyy HH:mm')}
                          </span>
                          <span>Enviadas: {notification.total_sent}</span>
                          <span>Entregues: {notification.total_delivered}</span>
                          <span>Falharam: {notification.total_failed}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedNotification(notification);
                                handleViewLogs(notification.id);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Logs da Notificação</DialogTitle>
                              <DialogDescription>
                                Detalhes de entrega para: {selectedNotification?.title}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              {isLoadingLogs ? (
                                <div className="flex items-center justify-center py-8">
                                  <LoadingSpinner />
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {notificationLogs.map((log) => (
                                    <div key={log.id} className="flex items-center justify-between p-3 border rounded">
                                      <div>
                                        <p className="font-medium">{log.user_profiles?.email}</p>
                                        <p className="text-sm text-muted-foreground">
                                          {log.user_profiles?.role} • {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                                        </p>
                                        {log.error_message && (
                                          <p className="text-sm text-red-600 mt-1">{log.error_message}</p>
                                        )}
                                      </div>
                                      {getStatusBadge(log.status)}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};