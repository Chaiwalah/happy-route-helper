
import { DeliveryOrder } from '@/utils/csvParser';
import { FieldStatus, FieldValidationStatus } from './types';

// Function to process field values - make sure they're strings and handle empty/undefined values
export const processFieldValue = (value: any): string => {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
};

// Get the validation status for a field
export const getFieldValidationStatus = (
  fieldName: string,
  value: string,
  missingFields: string[]
): FieldValidationStatus => {
  if (!value || value.trim() === '') {
    return 'error';
  }
  
  if (missingFields.includes(fieldName)) {
    return 'warning';
  }
  
  return 'valid'; // Changed from 'success' to 'valid' to match FieldValidationStatus type
};

// Get field status including both validation state and message
export const getFieldStatus = (
  fieldName: string,
  value: string,
  missingFields: string[]
): FieldStatus => {
  const status = getFieldValidationStatus(fieldName, value, missingFields);
  
  let message = '';
  
  if (status === 'error') {
    message = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
  } else if (status === 'warning') {
    message = `Please verify this ${fieldName.toLowerCase()}`;
  }
  
  return {
    status,
    message
  };
};

// Create adapter functions for compatibility with different function signatures
export const getOrderValidationStatus = (order: DeliveryOrder): 'valid' | 'warning' | 'error' => {
  // Implementation depends on your specific validation logic for orders
  // This is a stub that needs to be implemented based on your requirements
  if (!order) return 'error';
  
  // Example implementation: Check for missing required fields
  const missingRequiredFields = ['tripNumber', 'driver'].some(field => {
    const value = order[field as keyof DeliveryOrder];
    return value === null || value === undefined || String(value).trim() === '';
  });
  
  if (missingRequiredFields) return 'error';
  
  // Check for warnings (fields that need verification)
  const hasWarningFields = (order.missingFields || []).length > 0;
  if (hasWarningFields) return 'warning';
  
  return 'valid';
};

// Adapter for the field validation with different parameter count
export const getFieldValidationStatusAdapter = (
  fieldName: string, 
  value: string | null
): FieldValidationStatus => {
  if (value === null) return 'error';
  // We're using an empty array here as a default value for missing fields
  // In actual implementation, you might want to pass real missing fields from the context
  return getFieldValidationStatus(fieldName, value, []);
};
