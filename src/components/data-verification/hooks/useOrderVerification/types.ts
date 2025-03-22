
import { DeliveryOrder } from '@/utils/csvParser';

// Define the validation status type for field-level validation
export type FieldValidationStatus = 'valid' | 'warning' | 'error' | 'success' | 'info' | 'none';

// Interface for the order verification hook
export interface UseOrderVerificationProps {
  orders: DeliveryOrder[];
  onOrdersVerified: (verifiedOrders: DeliveryOrder[]) => void;
}

// Interface for the order verification hook return value
export interface UseOrderVerificationReturn {
  ordersWithIssues: DeliveryOrder[];
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  selectedOrder: DeliveryOrder | null;
  editingField: string | null;
  fieldValue: string;
  isSavingField: boolean;
  validationMessage: string | null;
  suggestedTripNumbers: string[];
  suggestedDrivers: string[];
  handleFieldEdit: (field: string, value: string) => void;
  handleFieldValueChange: (value: string) => void;
  handleFieldUpdate: () => void;
  handleOrdersApprove: () => void;
  getOrderValidationStatus: (order: DeliveryOrder) => 'valid' | 'warning' | 'error';
  getFieldValidationStatus: (fieldName: string, value: string) => FieldValidationStatus;
  updateOrder: (orderId: string, fieldName: string, value: string) => Promise<boolean>;
}
