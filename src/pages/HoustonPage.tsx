import React from "react";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import { Clock, RefreshCw, Shield, Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
export const HoustonPage: React.FC = () => {
  const {
    systemStatus,
    loading,
    isMaintenanceMode
  } = useMaintenanceMode();
  const {
    profile
  } = useAuth();
  const navigate = useNavigate();

  // Se não está em modo de manutenção e não há problemas, redirecionar
  React.useEffect(() => {
    if (!loading && !isMaintenanceMode && (!systemStatus || systemStatus.status === "maintenance")) {
      navigate("/", {
        replace: true
      });
    }
  }, [loading, isMaintenanceMode, systemStatus, navigate]);
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-4" />
          <p className="text-sm lg:text-base text-muted-foreground">Comendo cookies do sistema...</p>
        </div>
      </div>;
  }
  const getStatusText = () => {
    if (!systemStatus) return "Sistema em Manutenção";
    switch (systemStatus.status) {
      case "maintenance":
        return "Sistema em Manutenção";
      case "error":
        return "Problema no Sistema";
      default:
        return "Sistema Operacional";
    }
  };
  const getStatusColor = () => {
    if (!systemStatus) return "bg-primary/10 border-primary/20 text-primary";
    switch (systemStatus.status) {
      case "maintenance":
        return "bg-primary/10 border-primary/20 text-primary";
      case "error":
        return "bg-destructive/10 border-destructive/20 text-destructive";
      default:
        return "bg-green-500/10 border-green-500/20 text-green-600";
    }
  };
  const formatEstimatedResolution = (estimatedResolution: string | null) => {
    if (!estimatedResolution) return "Não informado";
    try {
      const date = new Date(estimatedResolution);
      return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return estimatedResolution;
    }
  };
  return <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="text-center">
          
          <h1 className="text-2xl lg:text-4xl font-bold text-foreground mb-2">houston, we have a problem</h1>
          <p className="text-sm lg:text-base text-muted-foreground">Sistema de Status em Tempo Real</p>
        </div>

        {/* Status Card */}
        <div className="bg-card border border-border rounded-2xl p-6 lg:p-8 shadow-sm">
          {/* Badge de Status */}
          <div className="flex justify-center mb-4 lg:mb-6">
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm lg:text-base font-medium border ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>

          {/* Mensagem */}
          <p className="text-center text-foreground text-sm lg:text-lg leading-relaxed mb-6">
            {systemStatus?.message || "Estamos trabalhando para resolver os problemas técnicos."}
          </p>

          {/* Previsão de Resolução */}
          {systemStatus?.estimated_resolution && <div className="flex items-center justify-center gap-3 p-4 bg-muted/50 rounded-xl mb-6">
              <Clock className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="text-center">
                <p className="text-xs lg:text-sm text-muted-foreground">Previsão de Resolução</p>
                <p className="text-sm lg:text-base font-semibold text-foreground">
                  {formatEstimatedResolution(systemStatus.estimated_resolution)}
                </p>
              </div>
            </div>}

          {/* Mensagem adicional */}
          <div className="text-center text-sm text-muted-foreground space-y-1 mb-6">
            <p>Nosso time está trabalhando para resolver esta situação.</p>
            <p>Agradecemos sua paciência e compreensão.</p>
          </div>

          {/* Botões de ação */}
          <div className="flex flex-col gap-3">
            <Button variant="outline" onClick={() => window.location.reload()} className="w-full h-11 gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar Status
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => navigate("/dashboard")} variant="outline" className="h-11 gap-2">
                <Home className="h-4 w-4" />
                Home
              </Button>

              <Button onClick={() => navigate("/auth")} variant="outline" className="h-11 gap-2">
                <ArrowRight className="h-4 w-4" />
                Login
              </Button>
            </div>

            {profile?.role === "admin" && <Button onClick={() => navigate("/problem")} className="w-full h-11 gap-2 bg-primary hover:bg-primary/90">
                <Shield className="h-4 w-4" />
                Painel Administrativo
              </Button>}
          </div>
        </div>

        {/* Contato */}
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">Para emergências, entre em contato:</p>
          <p className="text-sm font-medium text-foreground">suporte@onedrip.com.br</p>
          <Button variant="outline" size="sm" onClick={() => window.open("https://wa.me/5564996028022", "_blank")} className="gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.787" />
            </svg>
            WhatsApp
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-xs lg:text-sm text-muted-foreground space-y-1">
          <p>© 2026 OneDrip</p>
          <p className="text-[10px] text-muted-foreground/70">CNPJ: 64.797.431/0001-03</p>
          {systemStatus?.updated_at && <p>Última atualização: {new Date(systemStatus.updated_at).toLocaleString("pt-BR")}</p>}
        </div>
      </div>
    </div>;
};
export default HoustonPage;