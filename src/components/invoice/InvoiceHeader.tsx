
"use client"

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Invoice } from '@/utils/invoiceTypes';

interface InvoiceHeaderProps {
  invoice: Invoice | null;
}

export function InvoiceHeader({ invoice }: InvoiceHeaderProps) {
  if (!invoice) return null;
  
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-medium">Invoice {invoice.date}</h3>
        <Badge variant={
          invoice.status === 'finalized' ? 'default' : 
          invoice.status === 'reviewed' ? 'secondary' : 'outline'
        }>
          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
        </Badge>
        {invoice.recalculatedCount && (
          <Badge variant="outline" className="text-amber-500 border-amber-500">
            {invoice.recalculatedCount} manual adjustment{invoice.recalculatedCount > 1 ? 's' : ''}
          </Badge>
        )}
        {invoice.businessName && (
          <Badge variant="outline" className="text-blue-500 border-blue-500">
            {invoice.businessName}
          </Badge>
        )}
      </div>
      
      <div className="text-sm text-muted-foreground">
        Last modified: {new Date(invoice.lastModified).toLocaleString()}
      </div>
    </div>
  );
}
