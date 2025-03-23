
/**
 * Type definitions for order verification
 */

import { DeliveryOrder } from '@/utils/csvParser';

/**
 * Properties for useOrderVerification hook
 */
export interface UseOrderVerificationProps {
  orders: DeliveryOrder[];
  onOrdersVerified: (updatedOrders: DeliveryOrder[]) => void;
}

/**
 * Possible validation statuses for a field
 */
export type FieldValidationStatus = 'valid' | 'warning' | 'error' | 'success';

/**
 * Field status including validation state and message
 */
export interface FieldStatus {
  status: FieldValidationStatus;
  message: string;
}

/**
 * Return type for useOrderVerification hook
 */
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
  getOrderValidationStatus: (order: DeliveryOrder | null) => 'valid' | 'warning' | 'error';
  getFieldValidationStatus: (fieldName: string, value: string | null) => FieldValidationStatus;
  updateOrder: (orderId: string, fieldName: string, value: string) => Promise<boolean>;
}
