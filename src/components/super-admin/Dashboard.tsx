import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLicenseManagerEnhanced } from '@/components/admin/AdminLicenseManagerEnhanced';

export function Dashboard() {
  return <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Gerenciamento do sistema.</p>
        </div>
      </div>

      {/* Cards de Métricas Rápidas (Placeholder - podem ser conectados a dados reais depois) */}
      

      {/* Gerenciador de Licenças Unificado */}
      <div className="grid gap-4 md:grid-cols-1">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Painel de Controle de Licenças
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdminLicenseManagerEnhanced />
          </CardContent>
        </Card>
      </div>

    </div>;
}