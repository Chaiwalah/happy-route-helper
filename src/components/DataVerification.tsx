
"use client"

import { DataVerification as DataVerificationComponent } from './data-verification/DataVerification';
import { DeliveryOrder } from '@/utils/csvParser';

interface DataVerificationProps {
  orders: DeliveryOrder[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOrdersVerified: (updatedOrders: DeliveryOrder[]) => void;
}

// Export the component with a renamed prop to match the implementation
export function DataVerification(props: DataVerificationProps) {
  return (
    <DataVerificationComponent
      orders={props.orders}
      open={props.open}
      onOpenChange={props.onOpenChange}
      onOrdersUpdate={props.onOrdersVerified}
    />
  );
}
