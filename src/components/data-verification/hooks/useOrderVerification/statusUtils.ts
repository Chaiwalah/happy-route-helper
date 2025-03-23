
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
  
  return 'success';
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

// Alias for backward compatibility
export const getOrderValidationStatus = getFieldValidationStatus;
