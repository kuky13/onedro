import { LayoutDashboard, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLicenseManagerEnhanced } from '@/components/admin/AdminLicenseManagerEnhanced';

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <LayoutDashboard className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl lg:text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm lg:text-base text-muted-foreground">Gerenciamento geral do sistema.</p>
      </div>

      {/* Gerenciador de Licenças */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            Painel de Controle de Licenças
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdminLicenseManagerEnhanced />
        </CardContent>
      </Card>
    </div>
  );
}
