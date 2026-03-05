import * as XLSX from "xlsx";

export type RepairServiceExportRow = {
  created_at: string;
  device_name: string;
  service_description: string;
  cost_amount: number;
  charged_amount: number;
  net_profit: number | null;
  commission_amount: number | null;
  repair_technicians?: { name?: string | null } | null;
};

type ExportOptions = {
  monthLabel: string;
  filename: string;
};

const formatDateTimePtBR = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const exportRepairsMonthToXlsx = (
  services: RepairServiceExportRow[],
  options: ExportOptions
) => {
  const technicianNames = Array.from(
    new Set(
      (services || [])
        .map((s) => s.repair_technicians?.name)
        .filter((n): n is string => Boolean(n && n.trim()))
        .map((n) => n.trim())
    )
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const headers = [
    "Carimbo de data/hora",
    "Serviço",
    "Gastos",
    "Valor Passado ao cliente",
    "Lucro",
    ...technicianNames.map((n) => `Lucro ${n}`),
  ];

  const rows: any[][] = [];

  const totalCost = services.reduce((sum, s) => sum + Number(s.cost_amount || 0), 0);
  const totalCharged = services.reduce((sum, s) => sum + Number(s.charged_amount || 0), 0);
  const totalProfit = services.reduce(
    (sum, s) => sum + (Number(s.charged_amount || 0) - Number(s.cost_amount || 0)),
    0
  );
  const totalsByTech = new Map<string, number>();
  for (const name of technicianNames) totalsByTech.set(name, 0);
  for (const s of services) {
    const name = (s.repair_technicians?.name || "").trim();
    if (!name) continue;
    if (totalsByTech.has(name)) {
      totalsByTech.set(name, (totalsByTech.get(name) || 0) + Number(s.commission_amount || 0));
    }
  }

  // Linha de totais (logo abaixo do header) para ficar parecido com a planilha do exemplo
  rows.push([
    `TOTAL (${options.monthLabel})`,
    "",
    +totalCost.toFixed(2),
    +totalCharged.toFixed(2),
    +totalProfit.toFixed(2),
    ...technicianNames.map((n) => +(totalsByTech.get(n) || 0).toFixed(2)),
  ]);

  for (const s of services) {
    const profit = Number(s.charged_amount || 0) - Number(s.cost_amount || 0);
    const techName = (s.repair_technicians?.name || "").trim();
    rows.push([
      formatDateTimePtBR(s.created_at),
      `${s.device_name}${s.service_description ? ` - ${s.service_description}` : ""}`,
      +Number(s.cost_amount || 0).toFixed(2),
      +Number(s.charged_amount || 0).toFixed(2),
      +profit.toFixed(2),
      ...technicianNames.map((n) => +(n === techName ? Number(s.commission_amount || 0) : 0).toFixed(2)),
    ]);
  }

  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Ajuste simples de largura (melhora leitura)
  (sheet["!cols"] as any) = [
    { wch: 20 },
    { wch: 35 },
    { wch: 10 },
    { wch: 22 },
    { wch: 10 },
    ...technicianNames.map(() => ({ wch: 14 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Reparos");
  XLSX.writeFile(wb, options.filename);
};
