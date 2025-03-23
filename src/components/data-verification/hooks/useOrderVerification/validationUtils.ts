
import { DeliveryOrder } from '@/utils/csvParser';

// Helper to check if a driver value is "Unassigned"
export const isUnassignedDriver = (value: string | null | undefined): boolean => {
  if (!value) return false;
  return value.trim().toLowerCase() === 'unassigned';
};

// Helper to check if a value is empty
export const isEmptyValue = (value: string | null | undefined): boolean => {
  if (value === null || value === undefined) return true;
  return value.trim() === '';
};

// Check if a driver needs verification
export const isDriverNeedsVerification = (value: string | null | undefined): boolean => {
  if (!value) return true;
  const normalized = normalizeFieldValue(value);
  if (isEmptyValue(normalized)) return true;
  if (isPlaceholderValue(normalized)) return true;
  return false;
};

// Helper to check if a value is a common placeholder
export const isPlaceholderValue = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const normalized = normalizeFieldValue(value);
  if (normalized === '') return false;
  
  const placeholders = ['n/a', 'na', 'none', 'null', 'undefined', '-', 'tbd'];
  return placeholders.includes(normalized.toLowerCase());
};

// Normalize field value to handle empty strings and whitespace
export const normalizeFieldValue = (value: string | null | undefined): string => {
  if (value === null || value === undefined) return '';
  return value.trim();
};

// Enhanced validation that treats empty fields as invalid
export const strictValidateField = (
  field: string,
  value: string | null | undefined
): { isValid: boolean; message: string | null } => {
  // Normalize the value first
  const normalizedValue = normalizeFieldValue(value);
  
  if (field === 'tripNumber') {
    if (isEmptyValue(normalizedValue)) {
      return { isValid: false, message: 'Trip number is required.' };
    }
    if (isPlaceholderValue(normalizedValue)) {
      return { isValid: false, message: 'Trip number cannot be a placeholder value.' };
    }
    return { isValid: true, message: null };
  }

  if (field === 'driver') {
    if (isEmptyValue(normalizedValue)) {
      return { isValid: false, message: 'Driver is required.' };
    }
    // Note: "Unassigned" is now considered a valid value
    if (isUnassignedDriver(normalizedValue)) {
      return { isValid: true, message: null };
    }
    if (isPlaceholderValue(normalizedValue)) {
      return { isValid: false, message: 'Driver cannot be a placeholder value.' };
    }
    return { isValid: true, message: null };
  }

  // Default case for other fields
  return { isValid: true, message: null };
};

// Function to validate a field based on its type
export const validateField = (
  field: string,
  value: string,
  setValidationMessage: (message: string | null) => void
): boolean => {
  const result = strictValidateField(field, value);
  setValidationMessage(result.message);
  return result.isValid;
};

// Check if an order has complete data
export const hasCompleteData = (order: DeliveryOrder): boolean => {
  // Check tripNumber
  const tripNumberValidation = strictValidateField('tripNumber', order.tripNumber);
  if (!tripNumberValidation.isValid) return false;
  
  // Check driver
  const driverValidation = strictValidateField('driver', order.driver);
  if (!driverValidation.isValid) return false;
  
  // All critical fields are valid
  return true;
};

// Get all orders with complete data
export const getOrdersWithCompleteData = (orders: DeliveryOrder[]): DeliveryOrder[] => {
  return orders.filter(hasCompleteData);
};
