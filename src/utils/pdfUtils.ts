import jsPDF from 'jspdf';

// Tipos movidos para ./pdf/types.ts
export type { BudgetData, BudgetPartData, CompanyData } from './pdf/types';
import type { BudgetData, CompanyData, RGB } from './pdf/types';

// Utilitários movidos para módulos especializados
export { loadImage } from './pdf/imageLoader';
export {
  validateCompanyData,
  updateCompanyDataCache,
  getLocalCompanyCache,
  hasValidCompanyDataForPDF,
} from './pdf/companyDataUtils';

// Importações internas para uso neste arquivo
import { loadImage } from './pdf/imageLoader';
import { validateCompanyData, getLocalCompanyCache as getCachedCompanyData } from './pdf/companyDataUtils';


export const generateBudgetPDF = async (budget: BudgetData, companyData?: CompanyData, serviceTemplate?: string): Promise<Blob> => {
  // Starting PDF generation
  console.log('[PDF] generateBudgetPDF input budget:', budget);
  console.log('[PDF] notes received:', budget?.notes);
  // Budget data

  // Verificar se temos dados mínimos necessários
  const cachedData = getCachedCompanyData();
  if (!companyData && (!cachedData || !cachedData.hasData)) {
    console.warn('Dados da empresa não encontrados. Usando dados padrão.');
  }

  // Validar e normalizar dados da empresa com cache inteligente
  const validatedCompanyData = validateCompanyData(companyData);

  const doc = new jsPDF();
  // Robust page size retrieval across jsPDF versions
  const pageSizeAny = (doc.internal.pageSize as any);
  const defaultWidth = 210; // A4 width in mm
  const defaultHeight = 297; // A4 height in mm
  const pageWidth = (pageSizeAny?.getWidth ? pageSizeAny.getWidth() : doc.internal.pageSize.width) || defaultWidth;
  const pageHeight = (pageSizeAny?.getHeight ? pageSizeAny.getHeight() : doc.internal.pageSize.height) || defaultHeight;
  const margin = 10; // Compactar margens para 10
  let yPosition = 15; // Ajustar início para 15

  // Cores minimalistas e profissionais
  const darkGray: RGB = [64, 64, 64]; // Cinza escuro para texto
  const lightGray: RGB = [240, 240, 240]; // Cinza claro para backgrounds
  const mediumGray: RGB = [128, 128, 128]; // Cinza médio para bordas
  const headerGray: RGB = [200, 200, 200]; // Cinza para headers de tabela
  const white: RGB = [255, 255, 255];
  const black: RGB = [0, 0, 0];

  // Header simples e compacto
  // Logo - usar imagem real se disponível com retry
  let logoLoaded = false;
  if (validatedCompanyData.logo_url && validatedCompanyData.logo_url.trim() !== '') {
    try {
      // Attempting to load logo
      const logoDataURL = await loadImage(validatedCompanyData.logo_url, 3, 8000);
      doc.addImage(logoDataURL, 'JPEG', margin, yPosition - 5, 18, 18);
      logoLoaded = true;
      // Logo loaded and added
    } catch (error) {
      // Logo loading failed, using placeholder
      logoLoaded = false;
    }
  }

  // Placeholder elegante quando não há logo ou falha no carregamento
  if (!logoLoaded) {
    // Using logo placeholder
    doc.setDrawColor(...mediumGray);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, yPosition - 5, 18, 18, 2, 2, 'S');
    doc.setTextColor(...mediumGray);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('LOGO', margin + 6, yPosition + 3);
  }

  // Nome da empresa (usar dados validados)
  doc.setTextColor(...black);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(validatedCompanyData.shop_name, margin + 25, yPosition + 3);
  // Company name added

  // Subtítulo
  doc.setTextColor(...darkGray);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Assistência Técnica Especializada', margin + 25, yPosition + 10);

  // Adicionar dados da empresa no cabeçalho (lado direito) - usar dados validados
  doc.setFontSize(7);
  doc.setTextColor(...darkGray);
  const rightX = pageWidth - margin;
  let rightY = yPosition + 8; // Movido 8 pontos para baixo para melhor visibilidade

  if (validatedCompanyData.contact_phone && validatedCompanyData.contact_phone.trim() !== '') {
    doc.text(`Tel: ${validatedCompanyData.contact_phone}`, rightX, rightY, { align: 'right' });
    rightY += 6; // Aumentado de 4 para 6 para maior espaçamento
    // Phone added
  }

  if (validatedCompanyData.cnpj && validatedCompanyData.cnpj.trim() !== '') {
    doc.text(`CNPJ: ${validatedCompanyData.cnpj}`, rightX, rightY, { align: 'right' });
    rightY += 6; // Aumentado de 4 para 6 para maior espaçamento
    // CNPJ added
  }

  if (validatedCompanyData.address && validatedCompanyData.address.trim() !== '') {
    // Função para quebrar texto longo em múltiplas linhas
    const wrapText = (text: string, maxWidth: number) => {
      const words = text.split(' ');
      const lines = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = doc.getTextWidth(testLine);

        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            // Se uma palavra é muito longa, trunca ela
            lines.push(word.substring(0, Math.floor(maxWidth / doc.getTextWidth('M'))));
          }
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      return lines;
    };

    // Calcular largura máxima disponível para o endereço (metade da página)
    const maxAddressWidth = (pageWidth - 2 * margin) / 2;
    const addressText = `Endereço: ${validatedCompanyData.address}`;
    const addressLines = wrapText(addressText, maxAddressWidth);

    // Adicionar cada linha do endereço
    addressLines.forEach((line, index) => {
      doc.text(line, rightX, rightY + (index * 6), { align: 'right' }); // Aumentado de 4 para 6
    });

    // Ajustar rightY baseado no número de linhas do endereço
    rightY += (addressLines.length - 1) * 6; // Aumentado de 4 para 6
  }

  // Ajustar yPosition baseado na altura das informações da empresa
  const companyInfoHeight = Math.max(16, rightY - yPosition + 12); // Aumentado para acomodar o novo espaçamento
  yPosition += companyInfoHeight;

  // Título "ORÇAMENTO" centralizado com background
  doc.setFillColor(...lightGray);
  doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 15, 'F');

  doc.setTextColor(...black);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const titleText = 'ORÇAMENTO';
  const titleWidth = doc.getTextWidth(titleText);
  doc.text(titleText, (pageWidth - titleWidth) / 2, yPosition + 3);

  yPosition += 15;

  // Número OR centralizado
  const osNumber = budget.sequential_number
    ? `OR: ${budget.sequential_number.toString().padStart(4, '0')}`
    : `OR-${budget.id?.slice(-8)}`;

  doc.setTextColor(...darkGray);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const osNumberWidth = doc.getTextWidth(osNumber);
  doc.text(osNumber, (pageWidth - osNumberWidth) / 2, yPosition);

  yPosition += 10;

  // Seção de datas em formato de tabela com bordas (compacta)
  doc.setDrawColor(...mediumGray);
  doc.setLineWidth(0.5);

  // Cabeçalho da tabela de datas
  doc.setFillColor(...headerGray);
  doc.rect(margin, yPosition, (pageWidth - 2 * margin) / 2, 12, 'FD');
  doc.rect(margin + (pageWidth - 2 * margin) / 2, yPosition, (pageWidth - 2 * margin) / 2, 12, 'FD');

  doc.setTextColor(...black);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DATA DE EMISSÃO', margin + 3, yPosition + 8);
  doc.text('VÁLIDO ATÉ', margin + (pageWidth - 2 * margin) / 2 + 3, yPosition + 8);

  yPosition += 12;

  // Dados da tabela de datas
  doc.setFillColor(...white);
  doc.rect(margin, yPosition, (pageWidth - 2 * margin) / 2, 12, 'FD');
  doc.rect(margin + (pageWidth - 2 * margin) / 2, yPosition, (pageWidth - 2 * margin) / 2, 12, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.text(new Date(budget.created_at).toLocaleDateString('pt-BR'), margin + 3, yPosition + 8);

  const validityDate = budget.validity_date
    ? new Date(budget.validity_date).toLocaleDateString('pt-BR')
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');
  doc.text(validityDate, margin + (pageWidth - 2 * margin) / 2 + 3, yPosition + 8);

  yPosition += 20;

  // --- LÓGICA DE TEMPLATE PERSONALIZADO VS PADRÃO ---
  // Se existir um template, ele assume o controle TOTAL da seção de serviços/peças.
  // Caso contrário, renderiza a tabela padrão "DETALHES DO SERVIÇO" e a lista de peças padrão.

  if (serviceTemplate && serviceTemplate.trim().length > 0) {
    // --- RENDERIZAÇÃO VIA TEMPLATE ---
    doc.setTextColor(...black);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALHES DO SERVIÇO / PEÇAS', margin, yPosition);
    yPosition += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    // 1. Processar blocos de repetição (qualidades_inicio...fim)
    let message = serviceTemplate;
    const blockPatterns = [
      { start: '{qualidades_inicio}', end: '{qualidades_fim}' },
      { start: '{inicio_pecas}', end: '{fim_pecas}' }
    ];

    for (const pattern of blockPatterns) {
      if (message.includes(pattern.start) && message.includes(pattern.end)) {
        const parts = message.split(pattern.start);
        const before = parts[0];
        const rest = parts[1];

        if (!rest) continue;

        const splitRest = rest.split(pattern.end);
        const middle = splitRest[0];
        const after = splitRest[1];

        if (middle === undefined) continue;
        const afterContent = after || '';

        let processedParts = '';

        // Apenas iterar se houver peças
        if (budget.parts && budget.parts.length > 0) {
          budget.parts.forEach((part, index) => {
            let partText = middle;

            // Format values
            const partName = part.part_type || part.name || `Peça ${index + 1}`;
            const quantity = part.quantity || 1;
            const price = part.price || part.cash_price || 0;
            const installmentPrice = part.installment_price || price;
            const warranty = part.warranty_months || 0;
            const installmentCount = part.installment_count || budget.installment_count || 1;

            // Format currency helper
            const formatMoney = (val: number) => `R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(val)}`;

            // Logic based on whatsappUtils
            const validInstallments = installmentCount > 0 ? installmentCount : 1;
            let totalInstallment = installmentPrice > price ? installmentPrice : (price * validInstallments);

            if (part.installment_price) {
              totalInstallment = part.installment_price;
            } else {
              totalInstallment = price;
            }

            const monthlyValue = totalInstallment / validInstallments;

            // Placeholders
            const replacements: Record<string, string> = {
              '{qualidade_nome}': partName,
              '{peca_nome}': partName,
              '{qualidade_tipo}': partName,
              '{peca_quantidade}': quantity.toString(),
              '{peca_preco_vista}': formatMoney(price),
              '{peca_preco_parcelado}': formatMoney(totalInstallment),
              '{peca_parcelas}': (installmentCount > 1 ? installmentCount.toString() : ''),
              '{num_parcelas}': (installmentCount > 1 ? installmentCount.toString() : ''),
              '{peca_valor_parcela}': formatMoney(monthlyValue),
              '{peca_garantia}': warranty > 0 ? `${warranty} meses` : 'Sem garantia',
              '{peca_garantia_meses}': warranty.toString(),
            };

            Object.entries(replacements).forEach(([key, value]) => {
              partText = partText.split(key).join(value);
            });

            processedParts += partText;
          });
        }

        message = before + processedParts + afterContent;
        break; // Process only first valid block
      }
    }

    // 2. Substituições Globais
    const firstPart = budget.parts?.[0];
    const primaryInstallmentsCount = budget.installment_count || firstPart?.installment_count || 1;

    const replacements: Record<string, string> = {
      '{nome_reparo}': budget.device_model || 'Reparo',
      '{aparelho}': budget.device_model,
      '{modelo_dispositivo}': budget.device_model,
      '{parcelas}': primaryInstallmentsCount.toString(),
      '{num_parcelas}': primaryInstallmentsCount.toString(),
      '{nome_empresa}': validatedCompanyData.shop_name,
      '{endereco}': validatedCompanyData.address || '',
      '{telefone_contato}': validatedCompanyData.contact_phone || '',
      '{observacoes}': budget.notes || '',
      '{num_or}': budget.sequential_number ? `OR: ${budget.sequential_number.toString().padStart(4, '0')}` : `OR-${budget.id?.slice(-8)}`,
      '{data_validade}': budget.validity_date ? new Date(budget.validity_date).toLocaleDateString('pt-BR') : '',
    };

    Object.entries(replacements).forEach(([key, value]) => {
      message = message.split(key).join(value);
    });

    // Cleanup markup
    message = message.replace(/\*/g, '');

    // 3. Renderizar Texto Final
    const splitText = doc.splitTextToSize(message, pageWidth - 2 * margin);
    doc.text(splitText, margin, yPosition);
    yPosition += (splitText.length * 5) + 6;

  } else {
    // --- LOGIC PADRÃO (SEM TEMPLATE) ---

    // Seção "DETALHES DO SERVIÇO" header
    doc.setTextColor(...black);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALHES DO SERVIÇO', margin, yPosition);
    yPosition += 8;

    // Tabela fixa (Modelo / Serviço)
    doc.setFillColor(...darkGray);
    doc.rect(margin, yPosition, (pageWidth - 2 * margin) / 3, 12, 'F');
    doc.rect(margin + (pageWidth - 2 * margin) / 3, yPosition, 2 * (pageWidth - 2 * margin) / 3, 12, 'F');

    doc.setTextColor(...white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('ITEM', margin + 3, yPosition + 8);
    doc.text('DESCRIÇÃO', margin + (pageWidth - 2 * margin) / 3 + 3, yPosition + 8);

    yPosition += 12;

    const serviceDetails: Array<[string, string]> = [
      ['Modelo', budget.device_model || 'Não informado'],
      ['Serviço/Reparo', budget.part_quality || 'Não foi informada']
    ];
    serviceDetails.forEach((detail, index) => {
      const bgColor = index % 2 === 0 ? lightGray : white;
      doc.setFillColor(...bgColor);
      doc.rect(margin, yPosition, (pageWidth - 2 * margin) / 3, 12, 'FD');
      doc.rect(margin + (pageWidth - 2 * margin) / 3, yPosition, 2 * (pageWidth - 2 * margin) / 3, 12, 'FD');

      doc.setTextColor(...black);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(detail[0], margin + 3, yPosition + 8);
      doc.text(detail[1], margin + (pageWidth - 2 * margin) / 3 + 3, yPosition + 8);

      yPosition += 12;
    });

    // Se houver peças, insere a tabela de peças padrão
    if (budget.parts && budget.parts.length > 0) {
      yPosition += 6;

      doc.setTextColor(...black);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`SERVIÇOS / PEÇAS (${budget.parts.length})`, margin, yPosition);

      yPosition += 6;

      const tableWidth = pageWidth - 2 * margin;
      const colType = tableWidth * 0.30;
      const colCash = tableWidth * 0.18;
      const colInstPrice = tableWidth * 0.18;
      const colInstallments = tableWidth * 0.17;
      const colWarranty = tableWidth * 0.17;

      // Header da tabela de peças
      doc.setFillColor(...darkGray);
      doc.rect(margin, yPosition, colType, 8, 'F');
      doc.rect(margin + colType, yPosition, colCash, 8, 'F');
      doc.rect(margin + colType + colCash, yPosition, colInstPrice, 8, 'F');
      doc.rect(margin + colType + colCash + colInstPrice, yPosition, colInstallments, 8, 'F');
      doc.rect(margin + colType + colCash + colInstPrice + colInstallments, yPosition, colWarranty, 8, 'F');

      doc.setTextColor(...white);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text('QUALIDADE/TIPO', margin + 3, yPosition + 5);
      doc.text('À VISTA (R$)', margin + colType + 3, yPosition + 5);
      doc.text('PARCELADO (R$)', margin + colType + colCash + 3, yPosition + 5);
      doc.text('PARCELAS', margin + colType + colCash + colInstPrice + 3, yPosition + 5);
      doc.text('GARANTIA (MESES)', margin + colType + colCash + colInstPrice + colInstallments + 3, yPosition + 5);

      yPosition += 8;

      const rowHeight = budget.parts.length > 10 ? 7 : 8;

      const drawHeaderIfNewPage = () => {
        doc.setFillColor(...darkGray);
        doc.rect(margin, yPosition, colType, 8, 'F');
        doc.rect(margin + colType, yPosition, colCash, 8, 'F');
        doc.rect(margin + colType + colCash, yPosition, colInstPrice, 8, 'F');
        doc.rect(margin + colType + colCash + colInstPrice, yPosition, colInstallments, 8, 'F');
        doc.rect(margin + colType + colCash + colInstPrice + colInstallments, yPosition, colWarranty, 8, 'F');

        doc.setTextColor(...white);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.text('QUALIDADE/TIPO', margin + 3, yPosition + 5);
        doc.text('À VISTA (R$)', margin + colType + 3, yPosition + 5);
        doc.text('PARCELADO (R$)', margin + colType + colCash + 3, yPosition + 5);
        doc.text('PARCELAS', margin + colType + colCash + colInstPrice + 3, yPosition + 5);
        doc.text('GARANTIA (MESES)', margin + colType + colCash + colInstPrice + colInstallments + 3, yPosition + 5);

        yPosition += 8;
      };

      const visibleParts = budget.parts;
      visibleParts.forEach((p, idx) => {
        if (yPosition + rowHeight > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
          doc.setTextColor(...black);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(`SERVIÇOS / PEÇAS (continuação)`, margin, yPosition);
          yPosition += 6;
          drawHeaderIfNewPage();
        }

        const bgColor = idx % 2 === 0 ? lightGray : white;
        doc.setFillColor(...bgColor);
        doc.rect(margin, yPosition, colType, rowHeight, 'FD');
        doc.rect(margin + colType, yPosition, colCash, rowHeight, 'FD');
        doc.rect(margin + colType + colCash, yPosition, colInstPrice, rowHeight, 'FD');
        doc.rect(margin + colType + colCash + colInstPrice, yPosition, colInstallments, rowHeight, 'FD');
        doc.rect(margin + colType + colCash + colInstPrice + colInstallments, yPosition, colWarranty, rowHeight, 'FD');

        doc.setTextColor(...black);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');

        doc.text(p.part_type || '-', margin + 3, yPosition + 5);
        const cash = p.cash_price ?? p.price;
        doc.text(formatBRL(cash), margin + colType + 3, yPosition + 5);
        const instTotal = p.installment_price ?? p.price;
        doc.text(formatBRL(instTotal), margin + colType + colCash + 3, yPosition + 5);
        const count = p.installment_count || (budget.installment_count || 1);
        const perInstallment = count && instTotal ? instTotal / count : undefined;
        const installmentsText = count && perInstallment ? `${count}x de ${formatBRL(perInstallment)}` : '-';
        doc.text(installmentsText, margin + colType + colCash + colInstPrice + 3, yPosition + 5);
        const warranty = p.warranty_months ?? budget.warranty_months;
        doc.text(warranty ? `${warranty}` : '-', margin + colType + colCash + colInstPrice + colInstallments + 3, yPosition + 5);

        yPosition += rowHeight;
      });

      yPosition += 6; // espaço pós tabela
    }
  }

  // Seção "VALORES DO SERVIÇO" removida completamente
  // Manter espaçamento mínimo para layout
  yPosition += 6;

  // Seção "GARANTIA" (compacta)
  {
    const partMaxWarranty = (budget.parts && budget.parts.length > 0)
      ? budget.parts.reduce((max, p) => Math.max(max, p.warranty_months ?? 0), 0)
      : 0;
    const baseWarranty = budget.warranty_months ?? 0;
    const maxWarranty = Math.max(partMaxWarranty, baseWarranty);

    if (maxWarranty > 0) {
      // Título
      doc.setTextColor(...black);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('GARANTIA', margin, yPosition);
      yPosition += 5;

      // Caixa com destaque lateral
      const boxHeight = 12;
      const boxWidth = pageWidth - 2 * margin;
      doc.setFillColor(...lightGray);
      doc.setDrawColor(...mediumGray);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPosition, boxWidth, boxHeight, 'FD');
      // Barra lateral de destaque
      doc.setFillColor(160, 160, 160);
      doc.rect(margin, yPosition, 3, boxHeight, 'F');

      // Conteúdo
      doc.setTextColor(...black);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(`Prazo: até ${maxWarranty} meses`, margin + 6, yPosition + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...darkGray);
      doc.setFontSize(6);
      doc.text('• Garantia não cobre danos por queda, impacto ou líquidos', margin + 6, yPosition + 9);
      yPosition += boxHeight + 4;
    }
  }

  // Seção combinada "SERVIÇOS INCLUSOS" + coluna direita "OBSERVAÇÕES GERAIS"
  const includedServices: string[] = [];
  if (budget.includes_delivery === true) includedServices.push('Busca e entrega do aparelho');
  if (budget.includes_screen_protector === true) includedServices.push('Película de proteção de brinde');
  // Serviços personalizados
  if (budget.custom_services && budget.custom_services.trim() !== '') {
    const rawText = budget.custom_services.trim();
    const parsed = rawText
      .split(/[;,\n]+/)
      .map(s => s.replace(/^[•\-*\d]+[.)]?\s*/, '').trim())
      .filter(s => s.length > 0);
    const seen = new Set<string>();
    parsed.forEach(s => { const k = s.toLowerCase(); if (!seen.has(k)) { seen.add(k); includedServices.push(s); } });
  }

  const notesText = (budget.notes?.trim() || '');
  if (includedServices.length > 0 || notesText) {
    // Espaço mínimo antes da caixa combinada
    yPosition += 3;

    const paddingY = 3; // reduzir padding superior/inferior para subir conteúdo
    const rowHLeft = 7; // altura por item na coluna esquerda
    const lineHRight = 3; // altura por linha na coluna direita
    const boxWidth = pageWidth - 2 * margin;
    const bottomSafety = 5;
    const colGap = 2;
    const innerPadX = 6; // padding horizontal interno
    // Sem caixas: manter apenas altura de texto do cabeçalho
    const titleBoxH = 0; // sem retângulo
    const headerTextH = 7; // altura reservada para texto do título

    const leftColWidth = Math.floor((boxWidth - colGap) / 2);
    const rightColWidth = boxWidth - leftColWidth - colGap;

    // Preparar linhas da direita com quebra segura de palavras muito longas
    const rightHeader = notesText ? 'OBSERVAÇÕES GERAIS' : '';
    const normalizeLongWords = (t: string) => t.replace(/\S{20,}/g, (m) => (m.match(/.{1,20}/g) || [m]).join(' '));
    const notesNormalized = normalizeLongWords(notesText);
    const wrapWidthRight = Math.max(rightColWidth - 10, 20);
    const rightBodyLines = notesText ? doc.splitTextToSize(notesNormalized, wrapWidthRight) : [];
    let leftIndex = 0;
    let rightIndex = 0;
    // Controlar impressão do cabeçalho da direita
    let rightHeaderPrinted = false;

    // Safety counter to prevent runaway loops in edge cases
    let safetyCounter = 0;
    const MAX_BOXES = 200;
    while ((leftIndex < includedServices.length || rightIndex < rightBodyLines.length || (!rightHeaderPrinted && !!rightHeader)) && safetyCounter < MAX_BOXES) {
      let available = (pageHeight - margin - bottomSafety) - yPosition;
      if (available < (rowHLeft + paddingY * 2 + 10)) {
        doc.addPage();
        yPosition = margin;
        doc.setTextColor(...black);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        // Mantemos apenas os títulos dentro dos retângulos; sem cabeçalho central
        yPosition += 3;
        available = (pageHeight - margin - bottomSafety) - yPosition;
      }

      // Considerar cabeçalhos em retângulos em ambas as colunas
      const headerHLeft = headerTextH;
      const headerHRight = (!rightHeaderPrinted && !!rightHeader) ? headerTextH : 0;
      const safeVal = (v: number) => (Number.isFinite(v) ? v : 0);
      const capacityLeft = Math.max(safeVal(Math.floor((available - paddingY * 2 - headerHLeft) / rowHLeft)), 0);
      const capacityRight = Math.max(safeVal(Math.floor(((available - paddingY * 2 - headerHRight) / lineHRight))), 0);
      const takeLeft = Math.min(capacityLeft, includedServices.length - leftIndex);
      const takeRight = Math.min(capacityRight, rightBodyLines.length - rightIndex);
      const contentHLeft = headerHLeft + (Number.isFinite(takeLeft) ? takeLeft : 0) * rowHLeft;
      const contentHRight = headerHRight + (Number.isFinite(takeRight) ? takeRight : 0) * lineHRight;
      const boxHeightRaw = Math.max(contentHLeft, contentHRight) + paddingY * 2;
      const boxHeight = Number.isFinite(boxHeightRaw) && boxHeightRaw > 0 ? boxHeightRaw : (titleBoxH + paddingY * 2);

      // Caixa
      doc.setDrawColor(...mediumGray);
      doc.setLineWidth(0.5);
      doc.setFillColor(...white);
      doc.rect(margin, yPosition, boxWidth, boxHeight, 'FD');
      // Barra lateral cinza
      doc.setFillColor(160, 160, 160);
      doc.rect(margin, yPosition, 3, boxHeight, 'F');

      // Título "SERVIÇOS INCLUSOS" dentro do seu retângulo (coluna esquerda)
      doc.setTextColor(...black);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      const leftHeaderX = margin + innerPadX;
      const leftHeaderY = yPosition + paddingY + 1; // mover título mais para cima
      const leftHeaderW = leftColWidth - innerPadX * 2;
      // Sem retângulo: apenas texto do título
      doc.text('SERVIÇOS INCLUSOS', leftHeaderX + leftHeaderW / 2, leftHeaderY + 4, { align: 'center' });

      // Divisor vertical em cinza médio para uniformidade visual
      doc.setDrawColor(...mediumGray);
      doc.setLineWidth(0.5);
      const dividerX = margin + leftColWidth + colGap / 2;
      doc.line(dividerX, yPosition, dividerX, yPosition + boxHeight);

      // Render coluna esquerda (bullets pretos)
      const contentTopY = yPosition + paddingY + headerHLeft + 2; // bullets mais próximos ao título
      for (let i = 0; i < takeLeft; i++) {
        const raw = includedServices[leftIndex + i] ?? '';
        const innerWidth = leftColWidth - 12; // padding + bullet
        const wrapped = doc.splitTextToSize(raw, innerWidth);
        const line = wrapped.length > 1 ? `${wrapped[0].replace(/\s+$/, '')}…` : wrapped[0];
        doc.setTextColor(...black);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        const y = contentTopY + (i * rowHLeft);
        const x = margin + innerPadX; // dentro da coluna esquerda
        doc.text(`• ${line}`, x, y);
      }

      // Cabeçalho "OBSERVAÇÕES GERAIS" no seu retângulo (coluna direita)
      const cursorYRight = yPosition + paddingY + headerHRight + 2; // texto da direita mais próximo ao título
      const rightHeaderX = margin + leftColWidth + colGap + innerPadX;
      const rightHeaderY = yPosition + paddingY + 1; // mover título mais para cima
      const rightHeaderW = rightColWidth - innerPadX * 2;
      if (!rightHeaderPrinted && !!rightHeader) {
        // Sem retângulo: apenas texto do título
        doc.setTextColor(...black);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(rightHeader, rightHeaderX + rightHeaderW / 2, rightHeaderY + 4, { align: 'center' });
        rightHeaderPrinted = true;
      }

      doc.setTextColor(...black);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      for (let i = 0; i < takeRight; i++) {
        const line = rightBodyLines[rightIndex + i];
        doc.text(line, rightHeaderX, cursorYRight + (i * lineHRight));
      }

      // Avançar índices e posição
      leftIndex += takeLeft;
      rightIndex += takeRight;
      yPosition += boxHeight + 3;

      // Se não conseguimos consumir nada (capacidade zero), evitar loop infinito
      if (takeLeft === 0 && takeRight === 0 && rightHeaderPrinted) {
        break;
      }
      safetyCounter++;
    }
  }

  // Rodapé
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);

  // Footer text removed to avoid bugs

  // Retornar o PDF como Blob para compartilhamento
  const pdfBlob = doc.output('blob');
  // PDF generated successfully
  return pdfBlob;
};

// Função auxiliar para salvar o PDF localmente
export const saveBudgetPDF = async (budget: BudgetData, companyData?: CompanyData, serviceTemplate?: string) => {
  // Starting PDF save

  try {
    const pdfBlob = await generateBudgetPDF(budget, companyData, serviceTemplate);
    const validatedCompanyData = validateCompanyData(companyData);
    const shopSlug = (validatedCompanyData.shop_name || 'minha-loja')
      .replace(/\s+/g, '-')
      .toLowerCase();
    const modelSlug = (budget.device_model || 'dispositivo')
      .replace(/\s+/g, '-')
      .toLowerCase();
    // Usar número sequencial quando disponível; fallback para parte do UUID
    const seqFormatted = (budget.sequential_number != null && Number.isFinite(budget.sequential_number))
      ? `OR-${budget.sequential_number.toString().padStart(4, '0')}`
      : `OR-${(budget.id || '').slice(-8)}`;
    const fileName = `orcamento-${shopSlug}-${modelSlug}-${seqFormatted}.pdf`;

    // Generated filename

    // Criar link para download
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Download started successfully
  } catch (error) {
    console.error('Erro ao gerar/salvar PDF:', error);
    throw new Error('Falha ao gerar PDF. Verifique os dados da empresa.');
  }
};

// Funções de cache/validação movidas para ./pdf/companyDataUtils.ts
// Re-exportadas no topo deste arquivo

export default generateBudgetPDF;

// Função helper para formatar moeda brasileira com milhares
const formatBRL = (value?: number) => {
  if (value == null) return '-';
  return `R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
};