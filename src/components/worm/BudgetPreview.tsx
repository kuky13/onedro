import React, { useMemo } from 'react';
import { processBudgetTemplate } from '@/utils/wormPdfGenerator';

interface BudgetPreviewProps {
  budget: any;
  parts: any[];
  template: string;
  paperWidth: '58mm' | '80mm';
  companyName: string;
  companyPhone?: string;
  companyAddress?: string;
}

export const BudgetPreview: React.FC<BudgetPreviewProps> = ({
  budget,
  parts,
  template,
  paperWidth,
  companyName,
  companyPhone,
  companyAddress
}) => {
  const content = useMemo(() => {
    return processBudgetTemplate({
      budget,
      parts,
      template,
      companyName,
      companyPhone: companyPhone ?? '',
      companyAddress: companyAddress ?? ''
    });
  }, [budget, parts, template, companyName, companyPhone, companyAddress]);

  const width = paperWidth === '58mm' ? '280px' : '380px';
  const fontSize = paperWidth === '58mm' ? '12px' : '14px';

  return (
    <div 
      className="bg-white text-black font-mono shadow-md border border-gray-200 mx-auto overflow-hidden"
      style={{
        width,
        padding: '10px',
        fontSize,
        lineHeight: '1.2',
        whiteSpace: 'pre-wrap',
        fontFamily: "'Courier New', Courier, monospace"
      }}
    >
      {content}
    </div>
  );
};
