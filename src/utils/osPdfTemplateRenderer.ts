/**
 * Template-based PDF renderer for Service Orders.
 * Parses section-based templates and renders them using jsPDF
 * with the same visual style as the hardcoded generator.
 */
import jsPDF from 'jspdf';
import type { ServiceOrderData, CompanyData } from './serviceOrderPdfUtils';

// ─── COLORS (same as serviceOrderPdfUtils) ──────────────────────────
const ACCENT: [number, number, number] = [22, 78, 99];
const DARK: [number, number, number] = [15, 23, 42];
const MID: [number, number, number] = [100, 116, 139];
const LIGHT_BG: [number, number, number] = [241, 245, 249];
const WHITE: [number, number, number] = [255, 255, 255];
const ACCENT_LIGHT: [number, number, number] = [204, 251, 241];

// ─── TRANSLATION HELPERS ────────────────────────────────────────────
const translateStatus = (s: string) => ({
  opened: 'Ordem Aberta', pending_approval: 'Aguardando Aprovação', in_progress: 'Em Andamento',
  waiting_parts: 'Aguardando Peças', waiting_client: 'Aguardando Cliente', under_warranty: 'Em Garantia',
  ready_for_pickup: 'Pronto para Retirada', completed: 'Concluída', delivered: 'Entregue', cancelled: 'Cancelada',
}[s] || s);

const translatePriority = (s: string) => ({
  low: 'Baixa', medium: 'Médio', high: 'Alta', urgent: 'Urgente',
}[s] || s);

const translatePaymentStatus = (s: string) => ({
  pending: 'Pendente', paid: 'Pago', partial: 'Parcial', overdue: 'Em Atraso', cancelled: 'Cancelado',
}[s] || s);

const formatDate = (d?: string) => {
  if (!d) return '-';
  try { const dt = new Date(d); return isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString('pt-BR'); } catch { return '-'; }
};

const formatCurrency = (v?: number) => {
  if (!v || v <= 0) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
};

const hasValue = (v: any): boolean => {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') { const t = v.trim(); return t !== '' && t !== '00.000.000/0000-00'; }
  if (typeof v === 'number') return !isNaN(v) && isFinite(v);
  return Boolean(v);
};

// ─── PLACEHOLDER MAP BUILDER ────────────────────────────────────────
function buildPlaceholderMap(order: ServiceOrderData, company: CompanyData): Record<string, string> {
  const orderNum = order.sequential_number || order.id?.slice(-4) || '0000';
  return {
    '{logo}': '', // handled specially
    '{nome_empresa}': company.shop_name || 'Assistência Técnica',
    '{telefone}': company.phone || '',
    '{email}': company.email || '',
    '{endereco}': company.address || '',
    '{cnpj}': company.cnpj || '',
    '{num_os}': `OS-${String(orderNum).padStart(4, '0')}`,
    '{status}': translateStatus(order.status),
    '{prioridade}': translatePriority(order.priority || ''),
    '{data_entrada}': formatDate(order.entry_date || order.created_at),
    '{data_saida}': formatDate(order.exit_date),
    '{data_previsao}': formatDate(order.estimated_completion),
    '{data_entrega}': formatDate(order.delivery_date),
    '{nome_cliente}': order.client_name || '',
    '{telefone_cliente}': order.client_phone || '',
    '{endereco_cliente}': order.client_address || '',
    '{modelo_dispositivo}': order.device_model || '',
    '{tipo_dispositivo}': order.device_type || '',
    '{imei_serial}': order.imei_serial || '',
    '{defeito}': order.reported_issue || '',
    '{observacoes}': order.notes || '',
    '{obs_tecnico}': order.technician_notes || '',
    '{obs_cliente}': order.customer_notes || '',
    '{valor_total}': formatCurrency(order.total_price),
    '{custo_mao_obra}': formatCurrency(order.labor_cost),
    '{custo_pecas}': formatCurrency(order.parts_cost),
    '{status_pagamento}': translatePaymentStatus(order.payment_status || ''),
    '{garantia_meses}': String(order.warranty_months ?? company.warranty_months ?? 3),
    '{termos_cancelamento}': (company.warranty_cancellation_terms || '').replace(/NOMEDALOJA/g, company.shop_name || 'EMPRESA'),
    '{lembretes_garantia}': company.warranty_legal_reminders || '',
  };
}

function replacePlaceholders(text: string, map: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(map)) {
    result = result.split(key).join(value);
  }
  return result;
}

// ─── TEMPLATE PARSER ────────────────────────────────────────────────
interface TemplateBlock {
  type: 'header' | 'badge_os' | 'status' | 'section' | 'warranty' | 'signatures' | 'raw';
  title?: string;
  lines: string[];
}

function parseTemplate(template: string, placeholderMap: Record<string, string>): TemplateBlock[] {
  const blocks: TemplateBlock[] = [];
  const rawLines = template.split('\n');
  let currentBlock: TemplateBlock | null = null;

  const typeMap: Record<string, TemplateBlock['type']> = {
    CABECALHO: 'header',
    BADGE_OS: 'badge_os',
    STATUS: 'status',
    GARANTIA: 'warranty',
    ASSINATURAS: 'signatures',
  };

  const flush = () => { if (currentBlock) blocks.push(currentBlock); };

  for (const line of rawLines) {
    const match = line.trim().match(/^\[(CABECALHO|BADGE_OS|STATUS|GARANTIA|ASSINATURAS|SECAO:\s*(.+?))\]$/);
    if (match) {
      flush();
      const tag = match[1];
      if (tag.startsWith('SECAO:')) {
        const sectionTitle = match[2] || tag.replace('SECAO:', '').trim();
        currentBlock = { type: 'section', title: sectionTitle, lines: [] };
      } else {
        currentBlock = { type: typeMap[tag] || 'raw', lines: [] };
      }
    } else {
      const replaced = replacePlaceholders(line, placeholderMap);
      if (currentBlock) {
        currentBlock.lines.push(replaced);
      }
      // Lines before any block are ignored (no raw blocks needed for PDF)
    }
  }
  flush();
  return blocks;
}

// ─── DRAWING HELPERS ────────────────────────────────────────────────
const drawSectionTitle = (doc: jsPDF, title: string, x: number, y: number, w: number): number => {
  doc.setFillColor(...ACCENT);
  doc.rect(x, y, 3, 10, 'F');
  doc.setFillColor(...LIGHT_BG);
  doc.rect(x + 3, y, w - 3, 10, 'F');
  doc.setTextColor(...DARK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(title, x + 8, y + 7);
  return y + 14;
};

const drawField = (doc: jsPDF, label: string, value: string, x: number, y: number, rightEdge: number): number => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MID);
  doc.text(label, x, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK);
  doc.text(value, rightEdge, y, { align: 'right' });
  return y + 5.5;
};

const ensureSpace = (doc: jsPDF, y: number, needed: number, margin: number): number => {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 25) { doc.addPage(); return margin + 10; }
  return y;
};

// ─── IMAGE LOADER ───────────────────────────────────────────────────
const loadImage = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timeout = setTimeout(() => reject(new Error('Timeout')), 8000);
    img.onload = () => {
      clearTimeout(timeout);
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      if (!ctx) { reject(new Error('No ctx')); return; }
      c.width = img.width; c.height = img.height;
      ctx.drawImage(img, 0, 0);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => { clearTimeout(timeout); reject(new Error('Load fail')); };
    img.src = url;
  });
};

// ─── MAIN RENDERER ──────────────────────────────────────────────────
export async function generatePdfFromTemplate(
  templateContent: string,
  orderData: ServiceOrderData,
  companyData: CompanyData,
): Promise<void> {
  const placeholderMap = buildPlaceholderMap(orderData, companyData);
  const blocks = parseTemplate(templateContent, placeholderMap);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  const fieldRightEdge = pageWidth - margin - 5;
  let y = margin;

  // Top accent line
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, pageWidth, 3, 'F');
  y = 10;

  for (const block of blocks) {
    switch (block.type) {
      case 'header': {
        // Logo
        let logoLoaded = false;
        if (hasValue(companyData.logo_url)) {
          try {
            const logoData = await loadImage(companyData.logo_url!);
            doc.addImage(logoData, 'JPEG', margin, y, 18, 18);
            logoLoaded = true;
          } catch { /* skip */ }
        }
        const textX = logoLoaded ? margin + 22 : margin;

        // Parse lines for display
        const allText = block.lines.join('\n');
        const textLines = allText.split('\n').filter(l => l.trim());

        // Company name (first non-empty line, but strip the emoji logo placeholder)
        if (textLines.length > 0) {
          const nameLine = textLines[0].replace('🖼️', '').trim();
          doc.setTextColor(...DARK);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(nameLine || companyData.shop_name, textX, y + 7);
        }

        // Contact lines
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...MID);
        for (let i = 1; i < textLines.length; i++) {
          doc.text(textLines[i], textX, y + 13 + (i - 1) * 4);
        }

        y = 35;

        // Divider
        doc.setDrawColor(...LIGHT_BG);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
        break;
      }

      case 'badge_os': {
        const badgeText = block.lines.join(' ').trim();
        if (badgeText) {
          // Draw badge in top-right area (rewind Y)
          doc.setFillColor(...ACCENT);
          const badgeW = 38;
          const badgeH = 12;
          const badgeX = pageWidth - margin - badgeW;
          doc.roundedRect(badgeX, 10, badgeW, badgeH, 2, 2, 'F');
          doc.setTextColor(...WHITE);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          const numPart = badgeText.split('-')[0]?.trim() || badgeText;
          doc.text(numPart, badgeX + badgeW / 2, 18, { align: 'center' });

          // Date under badge
          const datePart = badgeText.includes('-') ? badgeText.split('-').slice(1).join('-').trim() : '';
          if (datePart) {
            doc.setTextColor(...MID);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text(datePart, badgeX + badgeW / 2, 27, { align: 'center' });
          }
        }
        break;
      }

      case 'status': {
        const pillText = block.lines.join(' ').trim();
        if (!pillText) break;

        const parts = pillText.split('|').map(s => s.trim()).filter(Boolean);
        let pillX = margin;

        for (const part of parts) {
          const isPayment = part.toLowerCase().includes('pagamento');
          const isPaid = part.toLowerCase().includes('pago');
          const isPriority = part.toLowerCase().includes('prioridade');

          let bg: [number, number, number] = ACCENT_LIGHT;
          let fg: [number, number, number] = ACCENT;

          if (isPriority) { bg = [254, 243, 199]; fg = [146, 64, 14]; }
          else if (isPayment) {
            bg = isPaid ? [220, 252, 231] : [254, 226, 226];
            fg = isPaid ? [22, 101, 52] : [153, 27, 27];
          }

          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          const tw = doc.getTextWidth(part) + 8;
          doc.setFillColor(...bg);
          doc.roundedRect(pillX, y, tw, 8, 2, 2, 'F');
          doc.setTextColor(...fg);
          doc.text(part, pillX + 4, y + 5.5);
          pillX += tw + 4;
        }

        y += 14;
        break;
      }

      case 'section': {
        y = ensureSpace(doc, y, 30, margin);
        y = drawSectionTitle(doc, block.title || '', margin, y, contentWidth);

        const nonEmpty = block.lines.filter(l => l.trim());

        for (const line of nonEmpty) {
          y = ensureSpace(doc, y, 8, margin);

          // Check if line is key:value format
          const colonIdx = line.indexOf(':');
          if (colonIdx > 0 && colonIdx < 30) {
            const key = line.substring(0, colonIdx + 1);
            const val = line.substring(colonIdx + 1).trim();
            if (val && val !== '-') {
              y = drawField(doc, key, val, margin + 5, y, fieldRightEdge);
            }
          } else if (line.trim()) {
            // Free text block (like issue description)
            doc.setTextColor(...DARK);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            const wrapped = doc.splitTextToSize(line, contentWidth - 14);

            // Light bg for text blocks
            const blockH = wrapped.length * 4.5 + 4;
            doc.setFillColor(...LIGHT_BG);
            doc.roundedRect(margin + 2, y - 2, contentWidth - 4, blockH, 2, 2, 'F');
            doc.setTextColor(...DARK);

            for (const wl of wrapped) {
              doc.text(wl, margin + 6, y + 2);
              y += 4.5;
            }
            y += 4;
          }
        }

        y += 4;
        break;
      }

      case 'warranty': {
        // New page for warranty
        doc.addPage();
        doc.setFillColor(...ACCENT);
        doc.rect(0, 0, pageWidth, 3, 'F');
        y = 14;

        doc.setFillColor(...ACCENT);
        doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');
        doc.setTextColor(...WHITE);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('TERMOS DE GARANTIA', pageWidth / 2, y + 10, { align: 'center' });
        y += 22;

        doc.setTextColor(...DARK);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');

        const nonEmpty = block.lines.filter(l => l.trim());
        for (const line of nonEmpty) {
          y = ensureSpace(doc, y, 6, margin);
          const wrapped = doc.splitTextToSize(line, contentWidth - 8);
          for (const wl of wrapped) {
            doc.text(wl, margin + 4, y);
            y += 4.5;
          }
          y += 2;
        }

        y += 10;
        break;
      }

      case 'signatures': {
        const sigStartY = Math.max(y + 10, pageHeight - 65);
        y = sigStartY;
        y = drawSectionTitle(doc, 'ASSINATURAS', margin, y, contentWidth);
        y += 2;

        const gap = 20;
        const sigW = (contentWidth - gap) / 2;

        doc.setTextColor(...MID);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Assinatura do Técnico', margin + sigW / 2, y, { align: 'center' });
        const lineY = y + 18;
        doc.setDrawColor(...DARK);
        doc.setLineWidth(0.3);
        doc.line(margin, lineY, margin + sigW, lineY);
        doc.setTextColor(...MID);
        doc.text('Data: ___/___/______', margin, lineY + 7);

        const clientX = margin + sigW + gap;
        doc.text('Assinatura do Cliente', clientX + sigW / 2, y, { align: 'center' });
        doc.line(clientX, lineY, clientX + sigW, lineY);
        doc.text('Data: ___/___/______', clientX, lineY + 7);
        y = lineY + 15;
        break;
      }
    }
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  const genText = `Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const footerY = pageHeight - 12;
    doc.setDrawColor(...LIGHT_BG);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
    doc.setTextColor(...MID);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(genText, margin, footerY);
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
  }

  // Save
  const orderNum = orderData.sequential_number || orderData.id?.slice(-4) || '0000';
  const fileDate = new Date().toISOString().split('T')[0];
  const fileName = `ordem-servico-${orderNum}-${orderData.client_name.replace(/\s+/g, '-').toLowerCase()}-${fileDate}.pdf`;
  doc.save(fileName);
  console.log('✅ PDF gerado via template:', fileName);
}

// ─── THERMAL LABEL RENDERER ────────────────────────────────────────
export function generateThermalLabelFromTemplate(
  templateContent: string,
  orderData: ServiceOrderData,
  companyData: CompanyData,
): { lines: { text: string; style?: 'bold' | 'xl' | 'small'; align?: 'center' | 'left'; isDivider?: boolean; isQr?: boolean }[] } {
  const placeholderMap = buildPlaceholderMap(orderData, companyData);
  let result = replacePlaceholders(templateContent, placeholderMap);

  const rawLines = result.split('\n');
  const parsed: { text: string; style?: 'bold' | 'xl' | 'small'; align?: 'center' | 'left'; isDivider?: boolean; isQr?: boolean }[] = [];

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (trimmed === '---' || trimmed === '—' || /^-{3,}$/.test(trimmed)) {
      parsed.push({ text: '', isDivider: true });
    } else if (trimmed === '[QR Code]' || trimmed.toLowerCase().includes('qr code')) {
      parsed.push({ text: '', isQr: true });
    } else if (trimmed.startsWith('CL:') || trimmed.startsWith('AP:') || trimmed.startsWith('DEF:')) {
      parsed.push({ text: trimmed, style: 'bold', align: 'left' });
    } else if (trimmed.match(/^OS-/)) {
      parsed.push({ text: trimmed, style: 'xl', align: 'center' });
    } else if (trimmed.length > 0) {
      // First line is company name (bold), rest center
      if (parsed.length === 0) {
        parsed.push({ text: trimmed, style: 'bold', align: 'center' });
      } else {
        parsed.push({ text: trimmed, align: 'center' });
      }
    }
  }

  return { lines: parsed };
}
