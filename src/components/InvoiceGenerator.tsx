
"use client"

import { DeliveryOrder } from '@/utils/csvParser';
import { InvoiceGeneratorMain } from './invoice/InvoiceGeneratorMain';

interface InvoiceGeneratorProps {
  orders: DeliveryOrder[];
}

export function InvoiceGenerator({ orders }: InvoiceGeneratorProps) {
  return <InvoiceGeneratorMain orders={orders} />;
}
