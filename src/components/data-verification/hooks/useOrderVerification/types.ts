
import { DeliveryOrder } from '@/utils/csvParser';

export type FieldValidationStatus = 'valid' | 'warning' | 'error';

export interface FieldStatus {
  status: FieldValidationStatus;
  message: string;
}

export type EditingField = 'driver' | 'tripNumber' | 'NONE';

export interface OrderVerificationState {
  orders: DeliveryOrder[];
  selectedOrderId: string | null;
  editingField: EditingField;
  fieldValue: string;
  validationMessage: string | null;
  isModified: boolean;
  isProcessing: boolean;
  processingProgress: number;
  ordersWithIssues: string[];
  allOrdersValid: boolean;
  suggestedTripNumbers: string[];
  suggestedDrivers: string[];
}

export interface OrderValidationIssue {
  id: string;
  driverIssue: boolean;
  tripNumberIssue: boolean;
}

export type OrderFieldValue = string | null | undefined;

export interface FieldUpdate {
  orderId: string;
  field: 'driver' | 'tripNumber';
  value: string;
}
