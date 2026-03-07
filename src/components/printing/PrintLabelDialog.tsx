import React, { useRef, useState, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import { QRCodeSVG } from 'qrcode.react';
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
import { Printer, Loader2 } from 'lucide-react';
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
  const width = '100%'; // Let container control width
  const padding = '4mm'; // Default visual padding
  // Thermal printers need larger, bolder fonts
  const fontSize = size === '58mm' ? '11px' : '13px'; 
  const qrSize = size === '58mm' ? 120 : 150; // Bigger QR for readability

  const orderNumber = order.sequential_number
    ? `OS-${String(order.sequential_number).padStart(4, '0')}`
    : `OS-${order.id.slice(-6).toUpperCase()}`;

  const entryDate = order.entry_date
    ? new Date(order.entry_date).toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR');

  // URL for the QR Code (example: link to status page)
  const qrValue = `${window.location.origin}/status/${order.id}`;

  const clientName = order.client_name || (order as any).clients?.name || 'Balcão';
  const issue = order.issue || (order as any).reported_issue;

  return (
    <div
      ref={ref}
      className="thermal-label"
      style={{
        width: width,
        padding: padding,
        fontFamily: "'Courier New', Courier, monospace", // Monospace is best for receipts
        fontSize: fontSize,
        fontWeight: 'bold', // Bold text prints better on thermal
        lineHeight: 1.3,
        backgroundColor: 'white',
        color: 'black',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        border: '1px solid #ddd', // visible only in preview
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ fontSize: '1.2em', marginBottom: '2px', textTransform: 'uppercase' }}>
        {companyData.shop_name}
      </div>
      {companyData.phone && <div style={{ fontSize: '0.9em', marginBottom: '4px' }}>{companyData.phone}</div>}

      <div style={{ borderBottom: '2px dashed black', width: '100%', margin: '4px 0' }} />

      {/* Order Info */}
      <div style={{ fontSize: '1.6em', margin: '4px 0', fontWeight: 800 }}>
        {orderNumber}
      </div>
      <div style={{ fontSize: '0.9em', marginBottom: '4px' }}>{entryDate}</div>

      <div style={{ borderBottom: '2px dashed black', width: '100%', margin: '4px 0' }} />

      {/* Client & Device */}
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

      {/* QR Code */}
      <div style={{ margin: '8px 0', padding: '4px', background: 'white' }}>
        <QRCodeSVG value={qrValue} size={qrSize} level="M" />
      </div>
      <div style={{ fontSize: '0.8em', textTransform: 'uppercase' }}>Consulte Status Online</div>
      
      <div style={{ marginTop: '10px', fontSize: '0.8em' }}>.</div>
    </div>
  );
});

ThermalLabel.displayName = 'ThermalLabel';

interface PrintLabelDialogProps {
  order: any; // Using any for flexibility with different order types
  companyData?: any;
}

export const PrintLabelDialog: React.FC<PrintLabelDialogProps> = ({ order, companyData }) => {
  const [size, setSize] = useState<'58mm' | '80mm'>('80mm');
  // Use state instead of useRef to ensure react-to-print gets the element after it mounts in the Dialog
  const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null);

  // Fallback company data if not provided
  const safeCompanyData = companyData || {
    shop_name: 'Minha Assistência',
    phone: '(00) 0000-0000',
  };

  const handlePrint = useReactToPrint({
    content: () => contentRef,
    documentTitle: `Etiqueta-${order.sequential_number || order.id}`,
    onAfterPrint: () => {
      toast.success('Impressão enviada!');
    },
    onPrintError: (errorLocation, error) => {
      console.error('Print Error:', errorLocation, error);
      toast.error('Erro ao imprimir etiqueta');
    },
    pageStyle: `
      @page {
        size: ${size === '58mm' ? '58mm' : '80mm'} auto;
        margin: 0mm;
      }
      @media print {
        html, body {
          width: ${size === '58mm' ? '58mm' : '80mm'};
          min-height: 100%;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden;
        }
        .thermal-label {
          width: 100% !important;
          max-width: ${size === '58mm' ? '58mm' : '80mm'} !important;
          padding: 3mm !important;
          border: none !important;
          box-shadow: none !important;
          margin: 0 auto !important;
          page-break-inside: avoid;
        }
      }
    `,
  });

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
            {/* The actual label component to be printed */}
            <ThermalLabel
              ref={setContentRef}
              order={order}
              companyData={safeCompanyData}
              size={size}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handlePrint} disabled={!contentRef} className="w-full sm:w-auto">
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
