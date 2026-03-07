import jsPDF from 'jspdf';
import { getCachedCompanyData } from '@/hooks/useCompanyDataLoader';

// Funções de tradução para status e prioridades
const translateStatus = (status: string): string => {
  const statusTranslations: { [key: string]: string } = {
    'opened': 'Ordem Aberta',
    'pending_approval': 'Aguardando Aprovação',
    'in_progress': 'Em Andamento',
    'waiting_parts': 'Aguardando Peças',
    'waiting_client': 'Aguardando Cliente',
    'under_warranty': 'Em Garantia',
    'ready_for_pickup': 'Pronto para Retirada',
    'completed': 'Concluída',
    'delivered': 'Entregue',
    'cancelled': 'Cancelada'
  };
  
  return statusTranslations[status] || status;
};

const translatePriority = (priority: string): string => {
  const priorityTranslations: { [key: string]: string } = {
    'low': 'Baixa',
    'medium': 'Médio',
    'high': 'Alta',
    'urgent': 'Urgente'
  };
  
  return priorityTranslations[priority] || priority;
};

const translatePaymentStatus = (status: string): string => {
  const paymentStatusTranslations: { [key: string]: string } = {
    'pending': 'Pendente',
    'paid': 'Pago',
    'partial': 'Parcial',
    'overdue': 'Em Atraso',
    'cancelled': 'Cancelado'
  };
  
  return paymentStatusTranslations[status] || status;
};

// Função para formatar datas em português
const formatDateToPT = (dateString?: string): string => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('pt-BR');
  } catch (error) {
    return '-';
  }
};

// Função para formatar valores monetários em reais
const formatCurrency = (value?: number): string => {
  if (!value || value <= 0) return 'R$ 0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Função para validar se um valor existe e não está vazio
const hasValue = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '00.000.000/0000-00' || trimmed === '00000000000000' || trimmed === '') return false;
    return true;
  }
  if (typeof value === 'number') return !isNaN(value) && isFinite(value);
  return Boolean(value);
};

// Função para quebrar texto em múltiplas linhas
const splitTextToLines = (doc: jsPDF, text: string, maxWidth: number): string[] => {
  if (!text || text.trim() === '') return [];
  return doc.splitTextToSize(text, maxWidth);
};

// Interface para dados da ordem de serviço (atualizada e completa)
export interface ServiceOrderData {
  id: string;
  sequential_number?: number;
  client_name: string;
  client_phone?: string;
  client_address?: string;
  device_model: string;
  device_type?: string;
  imei_serial?: string;
  reported_issue: string;
  labor_cost?: number;
  parts_cost?: number;
  total_price?: number;
  payment_status?: string;
  status: string;
  priority?: string;
  estimated_completion?: string;
  actual_completion?: string;
  warranty_months?: number;
  notes?: string;
  technician_notes?: string;
  customer_notes?: string;
  entry_date?: string;
  exit_date?: string;
  delivery_date?: string;
  created_at?: string;
  updated_at?: string;
}

// Interface para dados da empresa (melhorada)
export interface CompanyData {
  shop_name: string;
  phone?: string;
  email?: string;
  address?: string;
  logo_url?: string;
  warranty_months?: number;
  warranty_cancellation_terms?: string;
  warranty_legal_reminders?: string;
  cnpj?: string;
  whatsapp_phone?: string;
  contact_phone?: string;
  name?: string;
}

// Função utilitária para carregar imagens com retry e melhor tratamento de erro
const loadImage = async (url: string, maxRetries: number = 3, timeout: number = 8000): Promise<string> => {
  return new Promise((resolve, reject) => {
    let retries = 0;
    
    const attemptLoad = () => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const timeoutId = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        if (retries < maxRetries) {
          retries++;
          console.warn(`Tentativa ${retries} de carregar imagem: ${url}`);
          setTimeout(attemptLoad, 1000);
        } else {
          console.error(`Falha ao carregar imagem após ${maxRetries} tentativas: ${url}`);
          reject(new Error('Timeout ao carregar imagem'));
        }
      }, timeout);
      
      img.onload = () => {
        clearTimeout(timeoutId);
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Erro ao criar contexto do canvas'));
            return;
          }
          
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } catch (error) {
          console.error('Erro ao processar imagem:', error);
          reject(error);
        }
      };
      
      img.onerror = () => {
        clearTimeout(timeoutId);
        if (retries < maxRetries) {
          retries++;
          console.warn(`Erro ao carregar imagem, tentativa ${retries}: ${url}`);
          setTimeout(attemptLoad, 1000);
        } else {
          console.error(`Falha ao carregar imagem após ${maxRetries} tentativas: ${url}`);
          reject(new Error('Erro ao carregar imagem'));
        }
      };
      
      img.src = url;
    };
    
    attemptLoad();
  });
};

// Função para validar e obter dados da empresa (melhorada)
const validateCompanyData = async (): Promise<CompanyData> => {
  try {
    const cachedData = getCachedCompanyData();
    if (cachedData && cachedData.hasData) {
        const shopProfile = cachedData.shopProfile;
        const companyInfo = cachedData.companyInfo;
        
        const finalCnpj = companyInfo?.cnpj || shopProfile?.cnpj || '';
      
      const companyData = {
        shop_name: shopProfile?.shop_name || companyInfo?.name || 'Assistência Técnica',
        phone: shopProfile?.contact_phone || companyInfo?.whatsapp_phone || '',
        email: companyInfo?.email || '',
        address: shopProfile?.address || companyInfo?.address || '',
        logo_url: shopProfile?.logo_url || companyInfo?.logo_url || '',
        warranty_months: (shopProfile as any)?.warranty_months ?? (companyInfo as any)?.warranty_months ?? 3,
        warranty_cancellation_terms: companyInfo?.warranty_cancellation_terms || '',
        warranty_legal_reminders: companyInfo?.warranty_legal_reminders || '',
        cnpj: finalCnpj,
        whatsapp_phone: companyInfo?.whatsapp_phone || '',
        contact_phone: shopProfile?.contact_phone || ''
      };
      
      return companyData;
    }
    
    return {
      shop_name: 'Assistência Técnica',
      phone: '', email: '', address: '', logo_url: '',
      warranty_months: 3, warranty_cancellation_terms: '', warranty_legal_reminders: '',
      cnpj: '', whatsapp_phone: '', contact_phone: ''
    };
  } catch (error) {
    console.warn('Erro ao obter dados da empresa:', error);
    return {
      shop_name: 'Assistência Técnica',
      phone: '', email: '', address: '', logo_url: '',
      warranty_months: 3, warranty_cancellation_terms: '', warranty_legal_reminders: '',
      cnpj: '', whatsapp_phone: '', contact_phone: ''
    };
  }
};

// ─── HELPERS DE DESENHO ─────────────────────────────────────────────

const ACCENT: [number, number, number] = [22, 78, 99];     // teal-900
const DARK: [number, number, number] = [15, 23, 42];       // slate-900
const MID: [number, number, number] = [100, 116, 139];     // slate-500
const LIGHT_BG: [number, number, number] = [241, 245, 249]; // slate-100
const WHITE: [number, number, number] = [255, 255, 255];
const ACCENT_LIGHT: [number, number, number] = [204, 251, 241]; // teal-100

/** Draws a section title with a left accent bar */
const drawSectionTitle = (
  doc: jsPDF,
  title: string,
  x: number,
  y: number,
  contentWidth: number,
): number => {
  // Accent bar
  doc.setFillColor(...ACCENT);
  doc.rect(x, y, 3, 10, 'F');
  // Light background
  doc.setFillColor(...LIGHT_BG);
  doc.rect(x + 3, y, contentWidth - 3, 10, 'F');
  // Text
  doc.setTextColor(...DARK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(title, x + 8, y + 7);
  return y + 14;
};

/** Draws a key-value row with value aligned to the right */
const drawField = (
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  rightEdge: number = 0,
): number => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MID);
  doc.text(label, x, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK);
  if (rightEdge > 0) {
    doc.text(value, rightEdge, y, { align: 'right' });
  } else {
    doc.text(value, x + 45, y);
  }
  return y + 5.5;
};

/** Checks if we need a page break and adds one if so */
const ensureSpace = (doc: jsPDF, y: number, needed: number, margin: number): number => {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 25) {
    doc.addPage();
    return margin + 10;
  }
  return y;
};

// ─── MAIN PDF GENERATOR ─────────────────────────────────────────────

export const generateServiceOrderPDF = async (serviceOrderData: ServiceOrderData): Promise<void> => {
  try {
    const companyData = await validateCompanyData();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // ── HEADER ────────────────────────────────────────────────
    // Top accent line
    doc.setFillColor(...ACCENT);
    doc.rect(0, 0, pageWidth, 3, 'F');

    y = 10;

    let logoLoaded = false;
    if (hasValue(companyData.logo_url)) {
      try {
        const logoDataURL = await loadImage(companyData.logo_url!, 3, 8000);
        doc.addImage(logoDataURL, 'JPEG', margin, y, 18, 18);
        logoLoaded = true;
      } catch (error) {
        console.warn('⚠️ Erro ao carregar logo da empresa:', error);
      }
    }

    const textX = logoLoaded ? margin + 22 : margin;

    // Company name
    doc.setTextColor(...DARK);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(companyData.shop_name, textX, y + 7);

    // Contact info line
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MID);
    const contactParts: string[] = [];
    if (hasValue(companyData.phone)) contactParts.push(`Tel: ${companyData.phone}`);
    if (hasValue(companyData.email)) contactParts.push(companyData.email!);
    if (hasValue(companyData.cnpj)) contactParts.push(`CNPJ: ${companyData.cnpj}`);
    if (contactParts.length > 0) {
      doc.text(contactParts.join('  •  '), textX, y + 13);
    }

    if (hasValue(companyData.address)) {
      doc.text(companyData.address!, textX, y + 17);
    }

    // Order number badge — top right
    const orderNumber = serviceOrderData.sequential_number || serviceOrderData.id?.slice(-4) || '0000';
    const orderLabel = `OS #${String(orderNumber).padStart(4, '0')}`;

    doc.setFillColor(...ACCENT);
    const badgeW = 38;
    const badgeH = 12;
    const badgeX = pageWidth - margin - badgeW;
    doc.roundedRect(badgeX, y, badgeW, badgeH, 2, 2, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(orderLabel, badgeX + badgeW / 2, y + 8, { align: 'center' });

    // Date under badge
    const orderDate = formatDateToPT(serviceOrderData.created_at) || new Date().toLocaleDateString('pt-BR');
    doc.setTextColor(...MID);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(orderDate, badgeX + badgeW / 2, y + 17, { align: 'center' });

    y = 35;

    // Divider
    doc.setDrawColor(...LIGHT_BG);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    // ── STATUS PILLS ──────────────────────────────────────────
    // Render status and priority as compact pills
    const pills: { label: string; value: string; bg: [number, number, number]; fg: [number, number, number] }[] = [];

    pills.push({
      label: 'Status',
      value: translateStatus(serviceOrderData.status),
      bg: ACCENT_LIGHT,
      fg: ACCENT,
    });

    if (hasValue(serviceOrderData.priority)) {
      pills.push({
        label: 'Prioridade',
        value: translatePriority(serviceOrderData.priority!),
        bg: [254, 243, 199], // amber-100
        fg: [146, 64, 14],   // amber-800
      });
    }

    if (hasValue(serviceOrderData.payment_status)) {
      const isPaid = serviceOrderData.payment_status === 'paid';
      pills.push({
        label: 'Pagamento',
        value: translatePaymentStatus(serviceOrderData.payment_status!),
        bg: isPaid ? [220, 252, 231] : [254, 226, 226], // green-100 / red-100
        fg: isPaid ? [22, 101, 52] : [153, 27, 27],     // green-800 / red-800
      });
    }

    let pillX = margin;
    for (const pill of pills) {
      const text = `${pill.label}: ${pill.value}`;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      const tw = doc.getTextWidth(text) + 8;
      doc.setFillColor(...pill.bg);
      doc.roundedRect(pillX, y, tw, 8, 2, 2, 'F');
      doc.setTextColor(...pill.fg);
      doc.text(text, pillX + 4, y + 5.5);
      pillX += tw + 4;
    }

    y += 14;

    // ── DADOS DO CLIENTE ──────────────────────────────────────
    y = drawSectionTitle(doc, 'DADOS DO CLIENTE', margin, y, contentWidth);

    const fieldRightEdge = pageWidth - margin - 5;
    y = drawField(doc, 'Nome:', serviceOrderData.client_name, margin + 5, y, fieldRightEdge);

    if (hasValue(serviceOrderData.client_phone)) {
      y = drawField(doc, 'Telefone:', serviceOrderData.client_phone!.trim(), margin + 5, y, fieldRightEdge);
    }
    if (hasValue(serviceOrderData.client_address)) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...MID);
      doc.text('Endereço:', margin + 5, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK);
      const addrLines = splitTextToLines(doc, serviceOrderData.client_address!, contentWidth - 55);
      addrLines.forEach((line, i) => {
        doc.text(line, fieldRightEdge, y + i * 4, { align: 'right' });
      });
      y += addrLines.length * 4 + 2;
    }

    y += 4;

    // ── DADOS DO EQUIPAMENTO ──────────────────────────────────
    y = ensureSpace(doc, y, 30, margin);
    y = drawSectionTitle(doc, 'DADOS DO EQUIPAMENTO', margin, y, contentWidth);

    y = drawField(doc, 'Equipamento:', serviceOrderData.device_model, margin + 5, y, fieldRightEdge);

    if (hasValue(serviceOrderData.imei_serial)) {
      y = drawField(doc, 'IMEI/Serial:', serviceOrderData.imei_serial!.trim(), margin + 5, y, fieldRightEdge);
    }

    y += 4;

    // ── PROBLEMA RELATADO ─────────────────────────────────────
    if (hasValue(serviceOrderData.reported_issue)) {
      y = ensureSpace(doc, y, 30, margin);
      y = drawSectionTitle(doc, 'PROBLEMA RELATADO', margin, y, contentWidth);

      doc.setTextColor(...DARK);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');

      // Light background for the issue text
      const issueLines = splitTextToLines(doc, serviceOrderData.reported_issue, contentWidth - 14);
      const issueBlockH = issueLines.length * 4.5 + 6;
      doc.setFillColor(...LIGHT_BG);
      doc.roundedRect(margin + 2, y - 2, contentWidth - 4, issueBlockH, 2, 2, 'F');

      issueLines.forEach((line) => {
        doc.text(line, margin + 6, y + 2);
        y += 4.5;
      });

      y += 6;
    }

    // ── VALORES DO SERVIÇO ────────────────────────────────────
    const hasFinancialData = hasValue(serviceOrderData.total_price) ||
                            hasValue(serviceOrderData.labor_cost) ||
                            hasValue(serviceOrderData.parts_cost);

    if (hasFinancialData) {
      y = ensureSpace(doc, y, 30, margin);
      y = drawSectionTitle(doc, 'VALORES DO SERVIÇO', margin, y, contentWidth);

      if (hasValue(serviceOrderData.total_price)) {
        // Total highlight box
        doc.setFillColor(...ACCENT);
        doc.roundedRect(margin + 2, y - 2, contentWidth - 4, 14, 2, 2, 'F');
        doc.setTextColor(...WHITE);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL', margin + 8, y + 7);
        doc.text(formatCurrency(serviceOrderData.total_price), pageWidth - margin - 8, y + 7, { align: 'right' });
        y += 18;
      }

      y += 2;
    }

    // ── DATAS IMPORTANTES ─────────────────────────────────────
    const hasDateData = hasValue(serviceOrderData.entry_date) ||
                        hasValue(serviceOrderData.exit_date) ||
                        hasValue(serviceOrderData.estimated_completion) ||
                        hasValue(serviceOrderData.delivery_date);

    if (hasDateData) {
      y = ensureSpace(doc, y, 35, margin);
      y = drawSectionTitle(doc, 'DATAS IMPORTANTES', margin, y, contentWidth);

      // Render dates in a 2-column grid
      const dates: { label: string; value: string }[] = [];
      if (hasValue(serviceOrderData.entry_date)) dates.push({ label: 'Entrada', value: formatDateToPT(serviceOrderData.entry_date) });
      if (hasValue(serviceOrderData.exit_date)) dates.push({ label: 'Saída', value: formatDateToPT(serviceOrderData.exit_date) });
      if (hasValue(serviceOrderData.estimated_completion)) dates.push({ label: 'Previsão', value: formatDateToPT(serviceOrderData.estimated_completion) });
      if (hasValue(serviceOrderData.delivery_date)) dates.push({ label: 'Entrega', value: formatDateToPT(serviceOrderData.delivery_date) });

      const colW = (contentWidth - 10) / 2;
      for (let i = 0; i < dates.length; i += 2) {
        const row1 = dates[i]!;
        y = drawField(doc, `${row1.label}:`, row1.value, margin + 5, y);
        const row2 = dates[i + 1];
        if (row2) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(...MID);
          doc.text(`${row2.label}:`, margin + 5 + colW, y - 5.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...DARK);
          doc.text(row2.value, margin + 5 + colW + 45, y - 5.5);
        }
      }

      y += 4;
    }

    // ── OBSERVAÇÕES GERAIS ────────────────────────────────────
    const hasNotesData = hasValue(serviceOrderData.notes) ||
                        hasValue(serviceOrderData.technician_notes) ||
                        hasValue(serviceOrderData.customer_notes);

    if (hasNotesData) {
      y = ensureSpace(doc, y, 30, margin);
      y = drawSectionTitle(doc, 'OBSERVAÇÕES', margin, y, contentWidth);

      doc.setTextColor(...DARK);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');

      if (hasValue(serviceOrderData.notes)) {
        const notesLines = splitTextToLines(doc, String(serviceOrderData.notes ?? ''), contentWidth - 12);
        notesLines.forEach((line) => {
          y = ensureSpace(doc, y, 6, margin);
          doc.text(line, margin + 6, y);
          y += 4;
        });
        y += 3;
      }

      if (hasValue(serviceOrderData.technician_notes)) {
        y = ensureSpace(doc, y, 12, margin);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...ACCENT);
        doc.text('Observações Técnicas:', margin + 6, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DARK);
        const techLines = splitTextToLines(doc, String(serviceOrderData.technician_notes ?? ''), contentWidth - 12);
        techLines.forEach((line) => {
          y = ensureSpace(doc, y, 6, margin);
          doc.text(line, margin + 6, y);
          y += 4;
        });
        y += 3;
      }

      if (hasValue(serviceOrderData.customer_notes)) {
        y = ensureSpace(doc, y, 12, margin);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...ACCENT);
        doc.text('Observações do Cliente:', margin + 6, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DARK);
        const custLines = splitTextToLines(doc, String(serviceOrderData.customer_notes ?? ''), contentWidth - 12);
        custLines.forEach((line) => {
          y = ensureSpace(doc, y, 6, margin);
          doc.text(line, margin + 6, y);
          y += 4;
        });
      }

      y += 6;
    }

    // ── FOOTER – PAGE 1 ──────────────────────────────────────
    const footerY = pageHeight - 12;
    doc.setDrawColor(...LIGHT_BG);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
    doc.setTextColor(...MID);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    const genText = `Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
    doc.text(genText, margin, footerY);
    doc.text('Página 1 de 2', pageWidth - margin, footerY, { align: 'right' });

    // ══════════════════════════════════════════════════════════
    // SEGUNDA PÁGINA – TERMOS DE GARANTIA
    // ══════════════════════════════════════════════════════════
    doc.addPage();

    // Top accent line
    doc.setFillColor(...ACCENT);
    doc.rect(0, 0, pageWidth, 3, 'F');

    y = 14;

    // Title
    doc.setFillColor(...ACCENT);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('TERMOS DE GARANTIA', pageWidth / 2, y + 10, { align: 'center' });

    y += 22;

    // CONDIÇÕES DE CANCELAMENTO DA GARANTIA
    if (hasValue(companyData.warranty_cancellation_terms ?? '')) {
      y = drawSectionTitle(doc, 'CONDIÇÕES DE CANCELAMENTO DA GARANTIA', margin, y, contentWidth);

      doc.setTextColor(...DARK);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');

      const companyName = companyData.shop_name || companyData.name || 'EMPRESA';
      const cancellationTerms = String(companyData.warranty_cancellation_terms ?? '').replace(/NOMEDALOJA/g, companyName);

      const cancellationLines = splitTextToLines(doc, cancellationTerms, contentWidth - 8);
      cancellationLines.forEach((line) => {
        y = ensureSpace(doc, y, 6, margin);
        doc.text(line, margin + 4, y);
        y += 4.5;
      });

      y += 10;
    }

    // LEMBRETES
    if (hasValue(companyData.warranty_legal_reminders ?? '')) {
      y = ensureSpace(doc, y, 30, margin);
      y = drawSectionTitle(doc, 'LEMBRETES', margin, y, contentWidth);

      doc.setTextColor(...DARK);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');

      const legalLines = splitTextToLines(doc, String(companyData.warranty_legal_reminders ?? ''), contentWidth - 8);
      legalLines.forEach((line) => {
        y = ensureSpace(doc, y, 6, margin);
        doc.text(line, margin + 4, y);
        y += 4.5;
      });

      y += 12;
    }

    // ── ASSINATURAS ───────────────────────────────────────────
    const signatureStartY = pageHeight - 65;
    y = Math.max(y + 10, signatureStartY);

    y = drawSectionTitle(doc, 'ASSINATURAS', margin, y, contentWidth);

    y += 2;

    const signatureGap = 20;
    const sigWidth = (contentWidth - signatureGap) / 2;

    // Técnico
    doc.setTextColor(...MID);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Assinatura do Técnico', margin + sigWidth / 2, y, { align: 'center' });

    const lineY = y + 18;
    doc.setDrawColor(...DARK);
    doc.setLineWidth(0.3);
    doc.line(margin, lineY, margin + sigWidth, lineY);
    doc.setTextColor(...MID);
    doc.setFontSize(7);
    doc.text('Data: ___/___/______', margin, lineY + 7);

    // Cliente
    const clientX = margin + sigWidth + signatureGap;
    doc.text('Assinatura do Cliente', clientX + sigWidth / 2, y, { align: 'center' });
    doc.line(clientX, lineY, clientX + sigWidth, lineY);
    doc.text('Data: ___/___/______', clientX, lineY + 7);

    // Footer page 2
    const footer2Y = pageHeight - 12;
    doc.setDrawColor(...LIGHT_BG);
    doc.setLineWidth(0.5);
    doc.line(margin, footer2Y - 3, pageWidth - margin, footer2Y - 3);
    doc.setTextColor(...MID);
    doc.setFontSize(6);
    doc.text(genText, margin, footer2Y);
    doc.text('Página 2 de 2', pageWidth - margin, footer2Y, { align: 'right' });

    // ── SAVE ──────────────────────────────────────────────────
    const fileDate = new Date().toISOString().split('T')[0];
    const fileName = `ordem-servico-${orderNumber}-${serviceOrderData.client_name.replace(/\s+/g, '-').toLowerCase()}-${fileDate}.pdf`;
    doc.save(fileName);
    console.log('✅ PDF gerado com sucesso:', fileName);
     
   } catch (error) {
     console.error('❌ Erro ao gerar PDF:', error);
     throw error;
   }
};

// Função auxiliar para salvar PDF da ordem de serviço
export const saveServiceOrderPDF = async (serviceOrderData: ServiceOrderData): Promise<void> => {
  try {
    await generateServiceOrderPDF(serviceOrderData);
  } catch (error) {
    console.error('Erro ao salvar PDF:', error);
    throw error;
  }
};
