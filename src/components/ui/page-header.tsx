import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title: _title,
  description: _description,
  icon: _icon,
  className,
  children
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-2', className)}>
      











      
      {children}
    </div>);

}