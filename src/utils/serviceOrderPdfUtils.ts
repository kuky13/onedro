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
  if (value === null || value === undefined) {
    return false;
  }
  
  if (typeof value === 'string') {
    const trimmed = value.trim();
    
    // Verificar se é um placeholder de CNPJ
    if (trimmed === '00.000.000/0000-00' || trimmed === '00000000000000') {
      return false;
    }
    
    // Verificar se é uma string vazia ou apenas espaços
    if (trimmed === '') {
      return false;
    }
    
    return true;
  }
  
  if (typeof value === 'number') {
    // Para números, aceitar qualquer número válido (incluindo 0)
    return !isNaN(value) && isFinite(value);
  }
  
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
        warranty_months: shopProfile?.warranty_months || companyInfo?.warranty_months || 3,
        warranty_cancellation_terms: companyInfo?.warranty_cancellation_terms || '',
        warranty_legal_reminders: companyInfo?.warranty_legal_reminders || '',
        cnpj: finalCnpj,
        whatsapp_phone: companyInfo?.whatsapp_phone || '',
        contact_phone: shopProfile?.contact_phone || ''
      };
      

      
      return companyData;
    }
    
    // Fallback para dados padrão
    return {
      shop_name: 'Assistência Técnica',
      phone: '',
      email: '',
      address: '',
      logo_url: '',
      warranty_months: 3,
      warranty_cancellation_terms: '',
      warranty_legal_reminders: '',
      cnpj: '',
      whatsapp_phone: '',
      contact_phone: ''
    };
  } catch (error) {
    console.warn('Erro ao obter dados da empresa:', error);
    return {
      shop_name: 'Assistência Técnica',
      phone: '',
      email: '',
      address: '',
      logo_url: '',
      warranty_months: 3,
      warranty_cancellation_terms: '',
      warranty_legal_reminders: '',
      cnpj: '',
      whatsapp_phone: '',
      contact_phone: ''
    };
  }
};



// Função principal para gerar PDF da ordem de serviço
export const generateServiceOrderPDF = async (serviceOrderData: ServiceOrderData): Promise<void> => {
  try {
    // Validar dados da empresa
    const companyData = await validateCompanyData();
    
    // Criar documento PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 8; // Reduzido de 15 para 8
    const contentWidth = pageWidth - (margin * 2);
    
    // Cores do tema - Esquema profissional de cinza
    const primaryColor: [number, number, number] = [55, 65, 81]; // Cinza escuro profissional
    const secondaryColor: [number, number, number] = [107, 114, 128]; // Cinza médio
    const lightGray: [number, number, number] = [243, 244, 246]; // Cinza muito claro
    const darkGray: [number, number, number] = [31, 41, 55]; // Cinza muito escuro
    const accentGray: [number, number, number] = [156, 163, 175]; // Cinza de destaque
    
    let yPosition = margin;
    let logoLoaded = false;
    
    // CABEÇALHO DA EMPRESA
    doc.setFillColor(...lightGray);
    doc.rect(margin, yPosition, contentWidth, 28, 'F'); // Reduzido de 40 para 28
    
    // Tentar carregar logo da empresa
    if (hasValue(companyData.logo_url)) {
      try {
        const logoDataURL = await loadImage(companyData.logo_url!, 3, 8000);
        doc.addImage(logoDataURL, 'JPEG', margin + 3, yPosition + 3, 16, 16); // Logo menor
        logoLoaded = true;
      } catch (error) {
        console.warn('⚠️ Erro ao carregar logo da empresa:', error);
        logoLoaded = false;
      }
    }
    
    // Nome da empresa
    doc.setTextColor(...darkGray);
    doc.setFontSize(12); // Reduzido de 14 para 12
    doc.setFont('helvetica', 'bold');
    const logoOffset = logoLoaded ? 22 : 3; // Ajustado
    doc.text(companyData.shop_name, margin + logoOffset, yPosition + 10); // Ajustado
    
    // Informações de contato da empresa (renderização condicional)
    doc.setFontSize(7); // Reduzido de 9 para 7
    doc.setFont('helvetica', 'normal');
    let contactYPosition = yPosition + 18; // Reduzido de 20 para 18
    
    if (hasValue(companyData.phone)) {
      doc.text(`Tel: ${companyData.phone}`, margin + logoOffset, contactYPosition);
      contactYPosition += 3;
    }
    
    if (hasValue(companyData.email)) {
      doc.text(`Email: ${companyData.email}`, margin + logoOffset, contactYPosition);
      contactYPosition += 3;
    }
    
    if (hasValue(companyData.address)) {
      const addressLines = splitTextToLines(doc, `Endereço: ${companyData.address}`, contentWidth - logoOffset);
      addressLines.forEach((line) => {
        doc.text(line, margin + logoOffset, contactYPosition);
        contactYPosition += 3;
      });
    }
    
    // CNPJ (se disponível)
    if (hasValue(companyData.cnpj)) {
      doc.text(`CNPJ: ${companyData.cnpj}`, margin + logoOffset, contactYPosition);
      contactYPosition += 3;
    }
    
    // SEMPRE mostrar a data de geração do documento
    const documentGeneratedText = `Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
    doc.text(documentGeneratedText, margin + logoOffset, contactYPosition);
    contactYPosition += 3;
    
    yPosition += 32; // Reduzido de 45 para 32

    // TÍTULO PRINCIPAL
    doc.setFillColor(...primaryColor);
    doc.rect(margin, yPosition, contentWidth, 16, 'F'); // Reduzido de 15 para 16
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12); // Reduzido de 16 para 12
    doc.setFont('helvetica', 'bold');
    doc.text('ORDEM DE SERVIÇO', margin + 4, yPosition + 11); // Ajustado

    yPosition += 20;

    // INFORMAÇÕES BÁSICAS DA ORDEM DE SERVIÇO
    const orderNumber = serviceOrderData.sequential_number || serviceOrderData.id?.slice(-4) || '0000';
    const currentDate = new Date().toLocaleDateString('pt-BR');
    
    doc.setFillColor(...lightGray);
    doc.rect(margin, yPosition, contentWidth, 25, 'F');
    doc.setTextColor(...darkGray);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');

    // Primeira linha de informações
    doc.text(`Nº: ${String(orderNumber).padStart(4, '0')}`, margin + 5, yPosition + 8);
    const orderDate = formatDateToPT(serviceOrderData.created_at) || currentDate;
    doc.text(`Data: ${orderDate}`, margin + 60, yPosition + 8);
    
    // Segunda linha de informações
    doc.text(`Status: ${translateStatus(serviceOrderData.status)}`, margin + 5, yPosition + 16);
    if (hasValue(serviceOrderData.priority)) {
      doc.text(`Prioridade: ${translatePriority(serviceOrderData.priority!)}`, margin + 60, yPosition + 16);
    }
    
    // Terceira linha - Status de pagamento (se disponível)
    if (hasValue(serviceOrderData.payment_status)) {
      doc.text(`Pagamento: ${translatePaymentStatus(serviceOrderData.payment_status!)}`, margin + 120, yPosition + 8);
    }

    yPosition += 30;

    // DADOS DO CLIENTE
    doc.setFillColor(...secondaryColor);
    doc.rect(margin, yPosition, contentWidth, 10, 'F'); // Reduzido de 12 para 10
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9); // Reduzido de 10 para 9
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO CLIENTE', margin + 4, yPosition + 7); // Ajustado
    
    yPosition += 14; // Reduzido de 18 para 14

    doc.setTextColor(...darkGray);
    doc.setFontSize(8); // Reduzido de 10 para 8
    doc.setFont('helvetica', 'normal');

    // Layout em duas colunas para dados do cliente
    const labelColumnX = margin + 5; // leve recuo das labels
    const valueColumnX = margin + 60; // Reduzido de 150 para 60
    const rowGap = 6; // Reduzido de 7 para 6

    // Nome do cliente
    doc.setFont('helvetica', 'bold');
    doc.text('Nome:', labelColumnX, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(serviceOrderData.client_name, valueColumnX, yPosition);
    yPosition += rowGap;

    // Telefone do cliente (se disponível)
    if (serviceOrderData.client_phone && serviceOrderData.client_phone.trim() !== '') {
      doc.setFont('helvetica', 'bold');
      doc.text('Telefone:', labelColumnX, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(serviceOrderData.client_phone.trim(), valueColumnX, yPosition);
      yPosition += rowGap;
    }
    // Endereço do cliente (se disponível)
    if (hasValue(serviceOrderData.client_address)) {
      doc.setFont('helvetica', 'bold');
      doc.text('Endereço:', labelColumnX, yPosition);
      doc.setFont('helvetica', 'normal');
      const addressLines = splitTextToLines(doc, serviceOrderData.client_address!, contentWidth - 60);
      addressLines.forEach((line, index) => {
        doc.text(line, valueColumnX, yPosition + (index * 4));
      });
      yPosition += addressLines.length * 4;
    }

    yPosition += 4;

    // DADOS DO EQUIPAMENTO
    doc.setFillColor(...secondaryColor);
    doc.rect(margin, yPosition, contentWidth, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO EQUIPAMENTO', margin + 4, yPosition + 7);

    yPosition += 14;

    doc.setTextColor(...darkGray);
    doc.setFontSize(8); // Reduzido de 10 para 8

    // Layout em duas colunas para dados do equipamento
    const equipmentLabelColumnX = margin + 5;
    const equipmentValueColumnX = margin + 60; // Reduzido de 135 para 60

    // Modelo do equipamento
    doc.setFont('helvetica', 'bold');
    doc.text('Equipamento:', equipmentLabelColumnX, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(serviceOrderData.device_model, equipmentValueColumnX, yPosition);
    yPosition += rowGap;

    // IMEI/Serial (se disponível)
    if (serviceOrderData.imei_serial && serviceOrderData.imei_serial.trim() !== '') {
      doc.setFont('helvetica', 'bold');
      doc.text('IMEI/Serial:', equipmentLabelColumnX, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(serviceOrderData.imei_serial.trim(), equipmentValueColumnX, yPosition);
      yPosition += rowGap;
    }

    yPosition += 3; // Reduzido de 5 para 3

    // PROBLEMA RELATADO (sempre presente)
    if (hasValue(serviceOrderData.reported_issue)) {
      doc.setFillColor(...secondaryColor);
      doc.rect(margin, yPosition, contentWidth, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('PROBLEMA RELATADO', margin + 4, yPosition + 7);

      yPosition += 14;

      doc.setTextColor(...darkGray);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      
      const issueLines = splitTextToLines(doc, serviceOrderData.reported_issue, contentWidth - 8);
      issueLines.forEach((line) => {
        doc.text(line, margin + 4, yPosition);
        yPosition += 5;
      });

      yPosition += 6;
    }

    // VALORES DO SERVIÇO (renderização condicional)
    const hasFinancialData = hasValue(serviceOrderData.total_price) || 
                            hasValue(serviceOrderData.labor_cost) || 
                            hasValue(serviceOrderData.parts_cost);

    if (hasFinancialData) {
      doc.setFillColor(...primaryColor);
      doc.rect(margin, yPosition, contentWidth, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('VALORES DO SERVIÇO', margin + 5, yPosition + 7);

      yPosition += 15;

      doc.setTextColor(...darkGray);
      doc.setFontSize(10);

      // Total (destacado em verde)
      if (hasValue(serviceOrderData.total_price)) {
        doc.setFillColor(...secondaryColor);
        doc.rect(margin, yPosition - 2, contentWidth, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        const valuesLabelColumnX = margin + 5;
        const valuesValueColumnX = margin + 150;
        doc.text('TOTAL:', valuesLabelColumnX, yPosition + 5);
        doc.text(formatCurrency(serviceOrderData.total_price), valuesValueColumnX, yPosition + 5);
        yPosition += 12;
      }

      yPosition += 5;
    }

    // DATAS IMPORTANTES (renderização condicional)
    const hasDateData = hasValue(serviceOrderData.entry_date) || 
                        hasValue(serviceOrderData.exit_date) || 
                        hasValue(serviceOrderData.estimated_completion) ||
                        hasValue(serviceOrderData.delivery_date);
    if (hasDateData) {
      doc.setFillColor(...primaryColor);
      doc.rect(margin, yPosition, contentWidth, 10, 'F'); // Reduzido de 8 para 10
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9); // Reduzido de 10 para 9
      doc.setFont('helvetica', 'bold');
      doc.text('DATAS IMPORTANTES', margin + 4, yPosition + 7); // Ajustado
      yPosition += 14; // Reduzido de 15 para 14

      doc.setTextColor(...darkGray);
      doc.setFontSize(8); // Reduzido de 10 para 8
      const datesLabelColumnX = margin + 4; // Reduzido de 5 para 4
      const datesValueColumnX = margin + 60; // Reduzido de 150 para 60

      if (hasValue(serviceOrderData.entry_date)) {
        doc.setFont('helvetica', 'bold');
        doc.text('Entrada:', datesLabelColumnX, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDateToPT(serviceOrderData.entry_date), datesValueColumnX, yPosition);
        yPosition += rowGap;
      }

      if (hasValue(serviceOrderData.exit_date)) {
        doc.setFont('helvetica', 'bold');
        doc.text('Saída:', datesLabelColumnX, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDateToPT(serviceOrderData.exit_date), datesValueColumnX, yPosition);
        yPosition += rowGap;
      }

      if (hasValue(serviceOrderData.estimated_completion)) {
        doc.setFont('helvetica', 'bold');
        doc.text('Previsão:', datesLabelColumnX, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDateToPT(serviceOrderData.estimated_completion), datesValueColumnX, yPosition);
        yPosition += rowGap;
      }

      if (hasValue(serviceOrderData.delivery_date)) {
        doc.setFont('helvetica', 'bold');
        doc.text('Entrega:', datesLabelColumnX, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDateToPT(serviceOrderData.delivery_date), datesValueColumnX, yPosition);
        yPosition += rowGap;
      }

      yPosition += 3;
    }



    // STATUS E PRIORIDADE (renderização condicional)
    const hasStatusData = hasValue(serviceOrderData.status) || hasValue(serviceOrderData.priority);

    if (hasStatusData) {
      doc.setFillColor(...secondaryColor);
      doc.rect(margin, yPosition, contentWidth, 10, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('STATUS E PRIORIDADE', margin + 4, yPosition + 7);
      
      yPosition += 14;
      
      doc.setTextColor(...darkGray);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      
      // Status
      if (hasValue(serviceOrderData.status)) {
        doc.setFont('helvetica', 'bold');
        doc.text('Status:', margin + 4, yPosition);
        doc.setFont('helvetica', 'normal');
        
        // Definir cor baseada no status - usando tons de cinza
        let statusColor: [number, number, number] = darkGray;
        if (serviceOrderData.status === 'completed') {
          statusColor = [75, 85, 99]; // Cinza escuro
        } else if (serviceOrderData.status === 'in_progress') {
          statusColor = [107, 114, 128]; // Cinza médio
        } else if (serviceOrderData.status === 'pending') {
          statusColor = [156, 163, 175]; // Cinza claro
        }
        
        doc.setTextColor(...statusColor);
        doc.text(translateStatus(serviceOrderData.status), margin + 60, yPosition);
        yPosition += 6;
      }
      
      // Prioridade
      if (hasValue(serviceOrderData.priority)) {
        doc.setTextColor(...darkGray);
        doc.setFont('helvetica', 'bold');
        doc.text('Prioridade:', margin + 4, yPosition);
        doc.setFont('helvetica', 'normal');
        
        // Definir cor baseada na prioridade - usando tons de cinza
        let priorityColor: [number, number, number] = darkGray;
        if (serviceOrderData.priority === 'high') {
          priorityColor = [31, 41, 55]; // Cinza muito escuro
        } else if (serviceOrderData.priority === 'medium') {
          priorityColor = [75, 85, 99]; // Cinza escuro
        } else if (serviceOrderData.priority === 'low') {
          priorityColor = [107, 114, 128]; // Cinza médio
        }
        
        doc.setTextColor(...priorityColor);
        doc.text(translatePriority(serviceOrderData.priority), margin + 60, yPosition);
        yPosition += 6;
      }
      
      yPosition += 6;
    }

    // OBSERVAÇÕES GERAIS (renderização condicional)
    const hasNotesData = hasValue(serviceOrderData.notes) || 
                        hasValue(serviceOrderData.technician_notes) || 
                        hasValue(serviceOrderData.customer_notes);

    if (hasNotesData) {
      doc.setFillColor(...primaryColor);
      doc.rect(margin, yPosition, contentWidth, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9); // Reduzido de 12 para 9
      doc.setFont('helvetica', 'bold');
      doc.text('OBSERVAÇÕES GERAIS', margin + 4, yPosition + 7); // Ajustado

      yPosition += 14; // Reduzido de 15 para 14

      doc.setTextColor(...darkGray);
      doc.setFontSize(8); // Reduzido de 10 para 8
      doc.setFont('helvetica', 'normal');

      if (hasValue(serviceOrderData.notes)) {
        const notesLines = splitTextToLines(doc, serviceOrderData.notes!, contentWidth - 8); // Ajustado
        notesLines.forEach((line) => {
          doc.text(line, margin + 4, yPosition); // Ajustado
          yPosition += 4; // Reduzido de 5 para 4
        });
        yPosition += 2; // Reduzido de 3 para 2
      }

      if (hasValue(serviceOrderData.technician_notes)) {
        doc.setFont('helvetica', 'bold');
        doc.text('Observações Técnicas:', margin + 4, yPosition); // Ajustado
        yPosition += 4; // Reduzido de 5 para 4
        doc.setFont('helvetica', 'normal');
        const techNotesLines = splitTextToLines(doc, serviceOrderData.technician_notes!, contentWidth - 8); // Ajustado
        techNotesLines.forEach((line) => {
          doc.text(line, margin + 4, yPosition); // Ajustado
          yPosition += 4; // Reduzido de 5 para 4
        });
        yPosition += 2; // Reduzido de 3 para 2
      }

      if (hasValue(serviceOrderData.customer_notes)) {
        doc.setFont('helvetica', 'bold');
        doc.text('Observações do Cliente:', margin + 4, yPosition); // Ajustado
        yPosition += 4; // Reduzido de 5 para 4
        doc.setFont('helvetica', 'normal');
        const customerNotesLines = splitTextToLines(doc, serviceOrderData.customer_notes!, contentWidth - 8); // Ajustado
        customerNotesLines.forEach((line) => {
          doc.text(line, margin + 4, yPosition); // Ajustado
          yPosition += 4; // Reduzido de 5 para 4
        });
      }

      yPosition += 4; // Reduzido de 5 para 4
    }

    // RODAPÉ DA PRIMEIRA PÁGINA
    const footerY = pageHeight - 20;
    
    doc.setDrawColor(...primaryColor);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    
    doc.setTextColor(...primaryColor);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    
    // SEGUNDA PÁGINA - TERMOS DE GARANTIA
    doc.addPage();
    
    // Resetar posição Y para a segunda página - começar mais próximo do topo
    yPosition = margin + 10;
    
    // TÍTULO PRINCIPAL - TERMOS DE GARANTIA
    doc.setFillColor(...primaryColor);
    doc.rect(margin, yPosition, contentWidth, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('TERMOS DE GARANTIA', margin + 5, yPosition + 12);
    
    yPosition += 25;
    
    // CONDIÇÕES DE CANCELAMENTO DA GARANTIA
    if (hasValue(companyData.warranty_cancellation_terms)) {
      doc.setFillColor(...primaryColor);
      doc.rect(margin, yPosition, contentWidth, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('CONDIÇÕES DE CANCELAMENTO DA GARANTIA', margin + 5, yPosition + 8);
      
      yPosition += 18;
      
      doc.setTextColor(...darkGray);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Substituir NOMEDALOJA pelo nome real da empresa
      const companyName = companyData.shop_name || companyData.name || 'EMPRESA';
      const cancellationTerms = companyData.warranty_cancellation_terms.replace(/NOMEDALOJA/g, companyName);
      
      const cancellationLines = splitTextToLines(doc, cancellationTerms, contentWidth);
      cancellationLines.forEach((line) => {
        doc.text(line, margin, yPosition);
        yPosition += 4.5;
      });
      
      yPosition += 12;
    }
    
    // LEMBRETES
    if (hasValue(companyData.warranty_legal_reminders)) {
      doc.setFillColor(...primaryColor);
      doc.rect(margin, yPosition, contentWidth, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('LEMBRETES', margin + 5, yPosition + 8);
      
      yPosition += 18;
      
      doc.setTextColor(...darkGray);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const legalRemindersLines = splitTextToLines(doc, companyData.warranty_legal_reminders, contentWidth);
      legalRemindersLines.forEach((line) => {
        doc.text(line, margin, yPosition);
        yPosition += 4.5;
      });
      
      yPosition += 15;
    }
    
    // SEÇÃO DE ASSINATURAS
    // Posicionar as assinaturas com espaçamento otimizado
    const signatureStartY = pageHeight - 70; // 70 unidades do final da página
    yPosition = Math.max(yPosition + 15, signatureStartY);
    
    doc.setFillColor(...primaryColor);
    doc.rect(margin, yPosition, contentWidth, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ASSINATURAS', margin + 5, yPosition + 8);
    
    yPosition += 20;
    
    // Layout das assinaturas lado a lado com mais espaçamento
    const signatureSpacing = 25; // Aumentar espaço entre as colunas
    const signatureWidth = (contentWidth - signatureSpacing) / 2; // Dividir em duas colunas com mais espaço
    
    // ASSINATURA DO TÉCNICO (lado esquerdo)
    doc.setTextColor(...darkGray);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ASSINATURA DO TÉCNICO:', margin, yPosition);
    
    yPosition += 12; // Mais espaço após o título
    
    // Linha para assinatura do técnico
    doc.setDrawColor(...darkGray);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition + 18, margin + signatureWidth, yPosition + 18);
    
    // Campo de data para técnico
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Data: ___/___/______', margin, yPosition + 30);
    
    // ASSINATURA DO CLIENTE (lado direito) - resetar yPosition para alinhar
    const clientSignatureX = margin + signatureWidth + signatureSpacing;
    const clientYPosition = yPosition - 12; // Voltar para a mesma altura do título do técnico
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ASSINATURA DO CLIENTE:', clientSignatureX, clientYPosition);
    
    // Linha para assinatura do cliente
    doc.line(clientSignatureX, clientYPosition + 30, clientSignatureX + signatureWidth, clientYPosition + 30);
    
    // Campo de data para cliente
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Data: ___/___/______', clientSignatureX, clientYPosition + 42);

    // Salvar o PDF
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