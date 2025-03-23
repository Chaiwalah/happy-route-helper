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
// Function to validate a field based on its type
export const validateField = (
  field: string,
  value: string,
  setValidationMessage: (message: string | null) => void
): boolean => {
  if (field === 'tripNumber') {
    if (!value || value.trim() === '') {
      setValidationMessage('Trip number is required.');
      return false;
    }
    // Add more specific trip number validation if needed
    setValidationMessage(null);
    return true;
  }

  if (field === 'driver') {
    if (!value || value.trim() === '') {
      setValidationMessage('Driver is required.');
      return false;
    }
    // Add more specific driver validation if needed
    setValidationMessage(null);
    return true;
  }

  // Add validation for other fields as necessary
  return true;
};
