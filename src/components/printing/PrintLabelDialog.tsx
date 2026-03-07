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

  const qrValue = `${window.location.origin}/status/${order.id}`;
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
}

export const PrintLabelDialog: React.FC<PrintLabelDialogProps> = ({ order, companyData }) => {
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
  const qrValue = `${window.location.origin}/status/${order.id}`;

  const handleDownloadPDF = useCallback(async () => {
    setIsGenerating(true);
    try {
      const widthMM = size === '58mm' ? 58 : 80;
      const marginMM = 2;
      const usableW = widthMM - marginMM * 2;

      // Create PDF with exact thermal paper width, auto height
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [widthMM, 200], // tall enough, we'll trim
      });

      const fontSizeBase = size === '58mm' ? 7 : 8;
      const fontSizeLarge = size === '58mm' ? 9 : 11;
      const fontSizeXL = size === '58mm' ? 14 : 16;
      const centerX = widthMM / 2;
      let y = marginMM + 2;

      // Shop name
      doc.setFont('courier', 'bold');
      doc.setFontSize(fontSizeLarge);
      doc.text(safeCompanyData.shop_name.toUpperCase(), centerX, y, { align: 'center' });
      y += 4;

      // Phone
      if (safeCompanyData.phone) {
        doc.setFontSize(fontSizeBase);
        doc.text(safeCompanyData.phone, centerX, y, { align: 'center' });
        y += 3;
      }

      // Dashed line
      y += 1;
      doc.setLineDashPattern([1, 1], 0);
      doc.setLineWidth(0.3);
      doc.line(marginMM, y, widthMM - marginMM, y);
      y += 3;

      // Order number (big)
      doc.setFontSize(fontSizeXL);
      doc.text(orderNumber, centerX, y, { align: 'center' });
      y += 5;

      // Date
      doc.setFontSize(fontSizeBase);
      doc.text(entryDate, centerX, y, { align: 'center' });
      y += 3;

      // Dashed line
      y += 1;
      doc.line(marginMM, y, widthMM - marginMM, y);
      y += 3;

      // Client
      doc.setFontSize(fontSizeBase);
      doc.setFont('courier', 'bold');
      const clLines = doc.splitTextToSize(`CL: ${clientName}`, usableW);
      doc.text(clLines, marginMM, y);
      y += clLines.length * 3.5;

      // Device
      const apLines = doc.splitTextToSize(`AP: ${order.device_model || 'N/A'}`, usableW);
      doc.text(apLines, marginMM, y);
      y += apLines.length * 3.5;

      // Issue
      if (issue) {
        const defLines = doc.splitTextToSize(`DEF: ${issue}`, usableW);
        doc.text(defLines, marginMM, y);
        y += defLines.length * 3.5;
      }

      // Dashed line
      y += 1;
      doc.line(marginMM, y, widthMM - marginMM, y);
      y += 3;

      // QR Code - render from the preview SVG
      const svgEl = contentRef.current?.querySelector('svg');
      if (svgEl) {
        const qrDataUrl = await qrSvgToDataUrl(svgEl as SVGSVGElement);
        const qrSizeMM = size === '58mm' ? 28 : 35;
        const qrX = centerX - qrSizeMM / 2;
        doc.addImage(qrDataUrl, 'PNG', qrX, y, qrSizeMM, qrSizeMM);
        y += qrSizeMM + 2;
      }

      // Footer text
      doc.setFontSize(fontSizeBase - 1);
      doc.text('CONSULTE STATUS ONLINE', centerX, y, { align: 'center' });
      y += 5;

      // Trim the page to actual content height
      const finalHeight = y + 2;
      const trimmedDoc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [widthMM, finalHeight],
      });

      // Re-draw everything on the trimmed doc
      let y2 = marginMM + 2;

      trimmedDoc.setFont('courier', 'bold');
      trimmedDoc.setFontSize(fontSizeLarge);
      trimmedDoc.text(safeCompanyData.shop_name.toUpperCase(), centerX, y2, { align: 'center' });
      y2 += 4;

      if (safeCompanyData.phone) {
        trimmedDoc.setFontSize(fontSizeBase);
        trimmedDoc.text(safeCompanyData.phone, centerX, y2, { align: 'center' });
        y2 += 3;
      }

      y2 += 1;
      trimmedDoc.setLineDashPattern([1, 1], 0);
      trimmedDoc.setLineWidth(0.3);
      trimmedDoc.line(marginMM, y2, widthMM - marginMM, y2);
      y2 += 3;

      trimmedDoc.setFontSize(fontSizeXL);
      trimmedDoc.text(orderNumber, centerX, y2, { align: 'center' });
      y2 += 5;

      trimmedDoc.setFontSize(fontSizeBase);
      trimmedDoc.text(entryDate, centerX, y2, { align: 'center' });
      y2 += 3;

      y2 += 1;
      trimmedDoc.line(marginMM, y2, widthMM - marginMM, y2);
      y2 += 3;

      trimmedDoc.setFontSize(fontSizeBase);
      trimmedDoc.setFont('courier', 'bold');
      const clLines2 = trimmedDoc.splitTextToSize(`CL: ${clientName}`, usableW);
      trimmedDoc.text(clLines2, marginMM, y2);
      y2 += clLines2.length * 3.5;

      const apLines2 = trimmedDoc.splitTextToSize(`AP: ${order.device_model || 'N/A'}`, usableW);
      trimmedDoc.text(apLines2, marginMM, y2);
      y2 += apLines2.length * 3.5;

      if (issue) {
        const defLines2 = trimmedDoc.splitTextToSize(`DEF: ${issue}`, usableW);
        trimmedDoc.text(defLines2, marginMM, y2);
        y2 += defLines2.length * 3.5;
      }

      y2 += 1;
      trimmedDoc.line(marginMM, y2, widthMM - marginMM, y2);
      y2 += 3;

      const svgEl2 = contentRef.current?.querySelector('svg');
      if (svgEl2) {
        const qrDataUrl = await qrSvgToDataUrl(svgEl2 as SVGSVGElement);
        const qrSizeMM = size === '58mm' ? 28 : 35;
        const qrX = centerX - qrSizeMM / 2;
        trimmedDoc.addImage(qrDataUrl, 'PNG', qrX, y2, qrSizeMM, qrSizeMM);
        y2 += qrSizeMM + 2;
      }

      trimmedDoc.setFontSize(fontSizeBase - 1);
      trimmedDoc.text('CONSULTE STATUS ONLINE', centerX, y2, { align: 'center' });

      trimmedDoc.save(`Etiqueta-${orderNumber}.pdf`);
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Erro ao gerar PDF da etiqueta');
    } finally {
      setIsGenerating(false);
    }
  }, [size, order, safeCompanyData, orderNumber, entryDate, clientName, issue, qrValue]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
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
