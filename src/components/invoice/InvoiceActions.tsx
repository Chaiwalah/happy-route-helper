
"use client"

import React from 'react';
import { Button } from '@/components/ui/button';
import { Building, CheckCircle2, FileText } from 'lucide-react';
import { Invoice } from '@/utils/invoiceTypes';

interface InvoiceActionsProps {
  invoice: Invoice | null;
  onReview: () => void;
  onFinalize: () => void;
  onBusinessInfoClick: () => void;
}

export function InvoiceActions({
  invoice,
  onReview,
  onFinalize,
  onBusinessInfoClick
}: InvoiceActionsProps) {
  if (!invoice) return null;
  
  return (
    <>
      <Button 
        variant="outline" 
        onClick={onBusinessInfoClick}
        className="flex items-center"
      >
        <Building className="h-4 w-4 mr-2" />
        Business Info
      </Button>
      <Button 
        variant="outline" 
        disabled={invoice.status === 'finalized'} 
        onClick={onReview}
      >
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Review
      </Button>
      <Button 
        variant="outline" 
        disabled={invoice.status === 'finalized'} 
        onClick={onFinalize}
      >
        <FileText className="h-4 w-4 mr-2" />
        Finalize
      </Button>
    </>
  );
}
