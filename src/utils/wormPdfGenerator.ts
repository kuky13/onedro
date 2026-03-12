import { formatCurrency } from "@/utils/currency";

interface PdfGeneratorOptions {
  budget: any;
  parts: any[];
  template: string;
  paperWidth: '58mm' | '80mm';
  companyName: string;
  companyPhone?: string;
  companyAddress?: string;
}

export const processBudgetTemplate = ({
  budget,
  parts,
  template,
  companyName,
  companyPhone,
  companyAddress,
  paperWidth
}: Omit<PdfGeneratorOptions, 'paperWidth'> & { paperWidth?: '58mm' | '80mm' }) => {
  let content = template;

  // Ajuste de separadores baseado na largura do papel
  const separatorWidth = paperWidth === '58mm' ? 32 : 48; // Aproximado para Courier 10
  const dynamicSeparator = '-'.repeat(separatorWidth);

  // Substituir linhas que parecem separadores (ex: "------" ou "----------------") por separador dinâmico
  // Regex para encontrar linhas contendo apenas hifens (pelo menos 3)
  content = content.replace(/^(-{3,})$/gm, dynamicSeparator);
  
  // Também substituir o placeholder explícito {linha_tracejada} se existir
  content = content.replace(/{linha_tracejada}/g, dynamicSeparator);

  // Processar Loop de Qualidades/Peças
  if (content.includes('{qualidades_inicio}') && content.includes('{qualidades_fim}')) {
    const partsStart = content.indexOf('{qualidades_inicio}');
    const partsEnd = content.indexOf('{qualidades_fim}');
    
    if (partsStart !== -1 && partsEnd !== -1) {
      const beforeLoop = content.substring(0, partsStart);
      const afterLoop = content.substring(partsEnd + '{qualidades_fim}'.length);
      const loopTemplate = content.substring(partsStart + '{qualidades_inicio}'.length, partsEnd);
      
      let loopContent = '';
      
      if (parts && parts.length > 0) {
        parts.forEach(part => {
          let itemText = loopTemplate;
          
          const qty = part.quantity || 1;
          const cashUnit = part.cash_price ? part.cash_price : part.price ?? 0;
          const instUnit = part.installment_price || undefined;
          const count = part.installment_count ?? 0;
          const cashTotal = cashUnit * qty;
          const installmentTotal = instUnit !== undefined ? (count && count > 1 ? instUnit * count * qty : instUnit * qty) : undefined;
          
          const replacements: Record<string, string> = {
            '{qualidade_nome}': part.part_type || part.name || 'Padrão',
            '{peca_garantia_meses}': (part.warranty_months || budget.warranty_months || 0).toString(),
            '{peca_preco_vista}': formatCurrency(cashTotal),
            '{peca_preco_parcelado}': installmentTotal ? formatCurrency(installmentTotal) : formatCurrency(cashTotal),
            '{peca_parcelas}': count ? count.toString() : '1',
            '{peca_valor_parcela}': installmentTotal && count ? formatCurrency(installmentTotal / count) : formatCurrency(cashTotal),
            '{peca_quantidade}': qty.toString()
          };
          
          Object.entries(replacements).forEach(([key, value]) => {
            itemText = itemText.split(key).join(value);
          });
          
          loopContent += itemText;
        });
      } else {
        // Fallback
        let itemText = loopTemplate;
        const replacements: Record<string, string> = {
          '{qualidade_nome}': budget.part_quality || budget.part_type || 'Padrão',
          '{peca_garantia_meses}': (budget.warranty_months || 0).toString(),
          '{peca_preco_vista}': formatCurrency(budget.cash_price || budget.total_price || 0),
          '{peca_preco_parcelado}': formatCurrency(budget.installment_price || budget.total_price || 0),
          '{peca_parcelas}': (budget.installments || 1).toString(),
          '{peca_valor_parcela}': budget.installment_price && budget.installments ? formatCurrency(budget.installment_price) : formatCurrency(budget.total_price || 0),
          '{peca_quantidade}': '1'
        };
          Object.entries(replacements).forEach(([key, value]) => {
          itemText = itemText.split(key).join(value);
        });
        loopContent += itemText;
      }
      
      content = beforeLoop + loopContent + afterLoop;
    }
  }

  // Substituições Globais
  const servicesList = budget.custom_services 
    ? budget.custom_services.split(',').map((s: string) => `• ${s.trim()}`).join('\n')
    : '• Nenhum serviço adicional';

  // Formatação do número do orçamento: OR: 0000
  const rawNum = budget.sequential_number || budget.id?.slice(-6) || '0';
  const formattedNum = `OR: ${String(rawNum).padStart(4, '0')}`;

  const globalReplacements: Record<string, string> = {
    '{nome_empresa}': companyName,
    '{telefone_contato}': companyPhone || '',
    '{endereco}': companyAddress || '',
    '{endereço}': companyAddress || '', // Alias para facilitar
    '{modelo_dispositivo}': budget.device_model || 'Não informado',
    '{tipo_dispositivo}': budget.device_type || 'Dispositivo',
    '{nome_reparo}': budget.issue || budget.part_quality || 'Reparo',
    '{serviços}': servicesList,
    '{observacoes}': budget.notes || '',
    '{data_validade}': budget.valid_until ? new Date(budget.valid_until).toLocaleDateString('pt-BR') : '15 dias',
    '{num_or}': formattedNum,
    '{data_criacao}': new Date(budget.created_at).toLocaleDateString('pt-BR'),
    '{nome_cliente}': budget.client_name || 'Cliente',
    '{telefone_cliente}': budget.client_phone || '',
    '{status}': budget.workflow_status === 'pending' ? 'Pendente' : 
                budget.workflow_status === 'approved' ? 'Aprovado' : 
                budget.workflow_status === 'rejected' ? 'Rejeitado' : 
                budget.workflow_status || 'Pendente',
    '{preco_vista}': formatCurrency(budget.cash_price || 0),
    '{preco_parcelado}': formatCurrency(budget.installment_price || 0)
  };

  Object.entries(globalReplacements).forEach(([key, value]) => {
    content = content.split(key).join(value);
  });

  return content;
};

interface GroupPdfGeneratorOptions {
  budgets: any[];
  template: string;
  paperWidth: '58mm' | '80mm';
  companyName: string;
  companyPhone?: string;
  companyAddress?: string;
}

export const generateGroupBudgetPdf = async ({
  budgets,
  template,
  paperWidth,
  companyName,
  companyPhone,
  companyAddress
}: GroupPdfGeneratorOptions) => {
  try {
    const { jsPDF } = await import("jspdf");
    console.log('Starting Group PDF Generation (Single Document Mode)', { 
      budgetsCount: budgets.length, 
      templateLength: template?.length,
      paperWidth 
    });

    if (!template) {
      console.error('Template is empty or undefined');
      alert('Erro: Template de PDF vazio. Tente recarregar a página.');
      return;
    }

    const width = paperWidth === '58mm' ? 58 : 80;
    
    // Configurações de fonte e margem
    const fontSize = 10;
    const lineHeight = 3.5; // mm
    const margin = 2;
    const maxWidth = width - (margin * 2);
    const startY = margin + 2;

    // Usamos o primeiro orçamento como base para informações globais (Cliente, Aparelho, etc)
    const mainBudget = budgets[0];

    // Simulamos "peças" usando a lista de orçamentos
    // Cada orçamento se torna uma "opção/qualidade" no loop do template
    const simulatedParts = budgets.map(b => ({
      part_type: b.part_quality || b.part_type || 'Opção',
      name: b.part_quality || b.part_type || 'Opção',
      warranty_months: b.warranty_months,
      cash_price: b.cash_price,
      installment_price: b.installment_price,
      installment_count: b.installments,
      quantity: 1
    }));

    // Gerar conteúdo único processando o template uma vez com a lista de "peças" (orçamentos)
    const fullContent = processBudgetTemplate({
      budget: mainBudget,
      parts: simulatedParts,
      template,
      companyName,
      companyPhone: companyPhone ?? '',
      companyAddress: companyAddress ?? '',
      paperWidth
    });

    if (!fullContent.trim()) {
      console.warn('Generated content is empty');
    }

    // Cálculo de Altura Dinâmica
    const tempDoc = new jsPDF({ unit: "mm", format: [width, 1000] });
    tempDoc.setFont("courier", "normal");
    tempDoc.setFontSize(fontSize);
    
    const lines = fullContent.split('\n');
    let totalHeight = startY;

    lines.forEach(line => {
      const splitLine = tempDoc.splitTextToSize(line, maxWidth);
      const lineCount = Array.isArray(splitLine) ? splitLine.length : 1;
      totalHeight += (lineCount * lineHeight);
    });

    totalHeight += 5; // Margem extra no final
    const finalHeight = Math.max(totalHeight, 30);

    console.log('PDF Dimensions calculated', { finalHeight, totalLines: lines.length });

    // Criar PDF final
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [width, finalHeight] 
    });

    doc.setFont("courier", "normal");
    doc.setFontSize(fontSize);

    let y = startY;
    
    lines.forEach(line => {
      const splitLine = doc.splitTextToSize(line, maxWidth);
      
      if (Array.isArray(splitLine)) {
        splitLine.forEach((subLine: string) => {
          doc.text(subLine, margin, y);
          y += lineHeight;
        });
      } else {
        doc.text(splitLine, margin, y);
        y += lineHeight;
      }
    });

    // Nome do arquivo
    const deviceModel = budgets[0]?.device_model || 'aparelho';
    const filename = `orcamentos_${deviceModel.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
    doc.save(filename);
    console.log('PDF Saved:', filename);

  } catch (error) {
    console.error('Error generating Group PDF:', error);
    alert('Erro ao gerar PDF. Verifique o console para mais detalhes.');
  }
};

export const generateBudgetPdf = async ({
  budget,
  parts,
  template,
  paperWidth,
  companyName,
  companyPhone,
  companyAddress
}: PdfGeneratorOptions) => {
  const { jsPDF } = await import("jspdf");
  // Configuração do documento
  const width = paperWidth === '58mm' ? 58 : 80;
  
  // 1. Pré-processar conteúdo
  const content = processBudgetTemplate({
    budget,
    parts,
    template,
    companyName,
    companyPhone: companyPhone ?? '',
    companyAddress: companyAddress ?? '',
    paperWidth
  });

  // Cálculo de Altura Dinâmica

  // Configurações de fonte e margem
  const fontSize = 10;
  const lineHeight = 3.5; // mm - reduzido para melhor compactação
  const margin = 2;
  const maxWidth = width - (margin * 2);
  const startY = margin + 2;

  // Criamos um doc temporário apenas para calcular as linhas
  const tempDoc = new jsPDF({ unit: "mm", format: [width, 1000] });
  tempDoc.setFont("courier", "normal");
  tempDoc.setFontSize(fontSize);
  
  const lines = content.split('\n');
  let totalHeight = startY;

  lines.forEach(line => {
    // Calcular altura usando o mesmo método que a renderização
    const splitLine = tempDoc.splitTextToSize(line, maxWidth);
    
    // Garantir que splitLine é tratado corretamente
    const lineCount = Array.isArray(splitLine) ? splitLine.length : 1;
    totalHeight += (lineCount * lineHeight);
  });

  totalHeight += 5; // Margem extra no final

  // Se for muito pequeno, garantir um mínimo
  const finalHeight = Math.max(totalHeight, 30);

  // Agora criar o doc real com a altura correta
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [width, finalHeight] 
  });

  doc.setFont("courier", "normal");
  doc.setFontSize(fontSize);

  let y = startY;
  
  lines.forEach(line => {
    // splitTextToSize retorna array de strings
    const splitLine = doc.splitTextToSize(line, maxWidth);
    
    // Iterar sobre cada linha quebrada para garantir renderização correta sem justificação forçada
    if (Array.isArray(splitLine)) {
      splitLine.forEach((subLine: string) => {
        doc.text(subLine, margin, y);
        y += lineHeight;
      });
    } else {
      doc.text(splitLine, margin, y);
      y += lineHeight;
    }
  });

  // Salvar PDF
  const filename = `orcamento_${budget.client_name || 'cliente'}_${new Date().getTime()}.pdf`;
  doc.save(filename);
};
