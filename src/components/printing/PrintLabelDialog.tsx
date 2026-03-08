import React, { useRef, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Printer } from 'lucide-react';
import { toast } from 'sonner';

interface ThermalLabelProps {
  order: {
    id: string;
    sequential_number?: number;
    client_name?: string;
    device_model?: string;
    issue?: string;
    entry_date?: string;
    notes?: string;
  };
  companyData: {
    shop_name: string;
    phone?: string;
  };
  size: '58mm' | '80mm';
}

const ThermalLabel = React.forwardRef<HTMLDivElement, ThermalLabelProps>(({ order, companyData, size }, ref) => {
  const padding = '4mm';
  const fontSize = size === '58mm' ? '11px' : '13px';
  const qrSize = size === '58mm' ? 120 : 150;

  const orderNumber = order.sequential_number
    ? `OS-${String(order.sequential_number).padStart(4, '0')}`
    : `OS-${order.id.slice(-6).toUpperCase()}`;

  const entryDate = order.entry_date
    ? new Date(order.entry_date).toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR');

  const qrValue = order.sequential_number
    ? `${window.location.origin}/share/service-order/OS${String(order.sequential_number).padStart(4, '0')}`
    : `${window.location.origin}/share/service-order/${order.id}`;
  const clientName = order.client_name || (order as any).clients?.name || 'Balcão';
  const issue = order.issue || (order as any).reported_issue;

  return (
    <div
      ref={ref}
      className="thermal-label"
      style={{
        width: '100%',
        padding: padding,
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: fontSize,
        fontWeight: 'bold',
        lineHeight: 1.3,
        backgroundColor: 'white',
        color: 'black',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        border: '1px solid #ddd',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ fontSize: '1.2em', marginBottom: '2px', textTransform: 'uppercase' }}>
        {companyData.shop_name}
      </div>
      {companyData.phone && <div style={{ fontSize: '0.9em', marginBottom: '4px' }}>{companyData.phone}</div>}
      <div style={{ borderBottom: '2px dashed black', width: '100%', margin: '4px 0' }} />
      <div style={{ fontSize: '1.6em', margin: '4px 0', fontWeight: 800 }}>
        {orderNumber}
      </div>
      <div style={{ fontSize: '0.9em', marginBottom: '4px' }}>{entryDate}</div>
      <div style={{ borderBottom: '2px dashed black', width: '100%', margin: '4px 0' }} />
      <div style={{ width: '100%', textAlign: 'left', marginBottom: '2px' }}>
        CL: {clientName}
      </div>
      <div style={{ width: '100%', textAlign: 'left', marginBottom: '2px' }}>
        AP: {order.device_model || 'N/A'}
      </div>
      {issue && (
        <div style={{ width: '100%', textAlign: 'left', marginBottom: '4px' }}>
          DEF: {issue}
        </div>
      )}
      <div style={{ borderBottom: '2px dashed black', width: '100%', margin: '4px 0' }} />
      <div style={{ margin: '8px 0', padding: '4px', background: 'white' }}>
        <QRCodeSVG value={qrValue} size={qrSize} level="M" />
      </div>
      <div style={{ fontSize: '0.8em', textTransform: 'uppercase' }}>Consulte Status Online</div>
      <div style={{ marginTop: '10px', fontSize: '0.8em' }}>.</div>
    </div>
  );
});

ThermalLabel.displayName = 'ThermalLabel';

// Helper: convert QR SVG to data URL for jsPDF
function qrSvgToDataUrl(svgElement: SVGSVGElement): Promise<string> {
  return new Promise((resolve, reject) => {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  });
}

interface PrintLabelDialogProps {
  order: any;
  companyData?: any;
  triggerClassName?: string;
}

export const PrintLabelDialog: React.FC<PrintLabelDialogProps> = ({ order, companyData, triggerClassName }) => {
  const [size, setSize] = useState<'58mm' | '80mm'>('80mm');
  const [isGenerating, setIsGenerating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const safeCompanyData = companyData || {
    shop_name: 'Minha Assistência',
    phone: '(00) 0000-0000',
  };

  const orderNumber = order.sequential_number
    ? `OS-${String(order.sequential_number).padStart(4, '0')}`
    : `OS-${order.id.slice(-6).toUpperCase()}`;

  const entryDate = order.entry_date
    ? new Date(order.entry_date).toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR');

  const clientName = order.client_name || (order as any).clients?.name || 'Balcão';
  const issue = order.issue || (order as any).reported_issue;

  const drawLabel = useCallback(async (doc: jsPDF, widthMM: number) => {
    const marginMM = 3;
    const usableW = widthMM - marginMM * 2;
    const fontSizeBase = size === '58mm' ? 7 : 8;
    const fontSizeLarge = size === '58mm' ? 9 : 11;
    const fontSizeXL = size === '58mm' ? 14 : 16;
    const centerX = widthMM / 2;
    const lineHeight = size === '58mm' ? 3 : 3.5;
    let y = marginMM + 3;

    const drawDashedLine = (yPos: number) => {
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      // Draw individual dashes for clean rendering
      const dashLen = 1.5;
      const gapLen = 1;
      let x = marginMM;
      const endX = widthMM - marginMM;
      while (x < endX) {
        const end = Math.min(x + dashLen, endX);
        doc.line(x, yPos, end, yPos);
        x = end + gapLen;
      }
    };

    // Shop name
    doc.setFont('courier', 'bold');
    doc.setFontSize(fontSizeLarge);
    doc.text(safeCompanyData.shop_name.toUpperCase(), centerX, y, { align: 'center' });
    y += 4;

    // Phone
    if (safeCompanyData.phone) {
      doc.setFontSize(fontSizeBase);
      doc.setFont('courier', 'normal');
      doc.text(safeCompanyData.phone, centerX, y, { align: 'center' });
      y += 3;
    }

    // Dashed line
    y += 3;
    drawDashedLine(y);
    y += 7;

    // Order number (big)
    doc.setFont('courier', 'bold');
    doc.setFontSize(fontSizeXL);
    doc.text(orderNumber, centerX, y, { align: 'center' });
    y += 5;

    // Date
    doc.setFont('courier', 'normal');
    doc.setFontSize(fontSizeBase);
    doc.text(entryDate, centerX, y, { align: 'center' });
    y += 3;

    // Dashed line
    y += 3;
    drawDashedLine(y);
    y += 5;

    // Client, Device, Issue - left aligned
    doc.setFont('courier', 'bold');
    doc.setFontSize(fontSizeBase);

    const clLines = doc.splitTextToSize(`CL: ${clientName}`, usableW);
    doc.text(clLines, marginMM, y);
    y += clLines.length * lineHeight;

    const apLines = doc.splitTextToSize(`AP: ${order.device_model || 'N/A'}`, usableW);
    doc.text(apLines, marginMM, y);
    y += apLines.length * lineHeight;

    if (issue) {
      const defLines = doc.splitTextToSize(`DEF: ${issue}`, usableW);
      doc.text(defLines, marginMM, y);
      y += defLines.length * lineHeight;
    }

    // Dashed line
    y += 3;
    drawDashedLine(y);
    y += 5;

    // QR Code
    const svgEl = contentRef.current?.querySelector('svg');
    if (svgEl) {
      const qrDataUrl = await qrSvgToDataUrl(svgEl as SVGSVGElement);
      const qrSizeMM = size === '58mm' ? 28 : 35;
      const qrX = centerX - qrSizeMM / 2;
      doc.addImage(qrDataUrl, 'PNG', qrX, y, qrSizeMM, qrSizeMM);
      y += qrSizeMM + 2;
    }

    // Footer
    doc.setFont('courier', 'bold');
    doc.setFontSize(fontSizeBase - 1);
    doc.text('CONSULTE STATUS ONLINE', centerX, y, { align: 'center' });
    y += 3;

    return y;
  }, [size, safeCompanyData, orderNumber, entryDate, clientName, issue, order]);

  const handleDownloadPDF = useCallback(async () => {
    setIsGenerating(true);
    try {
      const widthMM = size === '58mm' ? 58 : 80;

      // First pass: measure height
      const measureDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [widthMM, 300] });
      const totalHeight = await drawLabel(measureDoc, widthMM);

      // Second pass: create with exact height
      const finalDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [widthMM, totalHeight + 3] });
      await drawLabel(finalDoc, widthMM);

      finalDoc.save(`Etiqueta-${orderNumber}.pdf`);
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Erro ao gerar PDF da etiqueta');
    } finally {
      setIsGenerating(false);
    }
  }, [size, drawLabel, orderNumber]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={`gap-2 ${triggerClassName || ''}`}>
          <Printer className="h-4 w-4" />
          Etiqueta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Imprimir Etiqueta Térmica</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Tamanho do Papel</label>
              <Select value={size} onValueChange={(v: '58mm' | '80mm') => setSize(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58mm">58mm (Pequeno)</SelectItem>
                  <SelectItem value="80mm">80mm (Padrão)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-md p-4 bg-gray-50 flex justify-center overflow-auto max-h-[400px]">
            <ThermalLabel
              ref={contentRef}
              order={order}
              companyData={safeCompanyData}
              size={size}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleDownloadPDF} 
            disabled={isGenerating}
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            {isGenerating ? 'Gerando...' : 'Baixar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
