
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';

/**
 * Enhanced utility to check if a value is effectively empty
 */
export const isEmptyValue = (value: any): boolean => {
  // Check for undefined or null (including objects that represent undefined)
  if (value === undefined || value === null) return true;
  
  // Check for objects with _type property set to "undefined"
  if (typeof value === 'object' && value._type === 'undefined') return true;
  
  // If it's a string, check if it's empty or special "empty" values
  if (typeof value === 'string') {
    return value.trim() === '' || 
           value.toLowerCase() === 'n/a' || 
           value.toLowerCase() === 'na' || 
           value.toLowerCase() === 'none' || 
           value.trim() === '-';
  }
  
  return false;
};

/**
 * Specific check for unassigned drivers
 */
export const isUnassignedDriver = (value: any): boolean => {
  // Check for undefined or null (including objects that represent undefined)
  if (isEmptyValue(value)) return true;
  
  // Check specifically for the string "Unassigned"
  if (typeof value === 'string') {
    return value.trim() === 'Unassigned';
  }
  
  return false;
};

/**
 * Validates a field based on field name and value
 */
export const validateField = (
  fieldName: string, 
  value: any,
  setValidationMessage: (message: string | null) => void
): boolean => {
  // Reset validation message
  setValidationMessage(null);
  
  if (isEmptyValue(value)) {
    if (fieldName === 'tripNumber') {
      setValidationMessage('Trip Number cannot be empty');
      return false;
    }
    
    if (fieldName === 'driver') {
      setValidationMessage('Driver cannot be empty');
      return false;
    }
  }
  
  if (fieldName === 'tripNumber' && !isEmptyValue(value)) {
    // Make sure value is treated as a string
    const stringValue = String(typeof value === 'object' ? value.value || '' : value);
    
    // Check for noise/test values
    if (isNoiseOrTestTripNumber(stringValue)) {
      setValidationMessage('Warning: This appears to be a test/noise value');
      return false;
    }
    
    // Check for N/A values
    if (['n/a', 'na', 'none'].includes(stringValue.toLowerCase())) {
      setValidationMessage('Trip Number cannot be N/A or None');
      return false;
    }
    
    // Validate proper trip number format (e.g. TR-123456)
    const tripNumberPattern = /^([A-Za-z]{1,3}[\-\s]?\d{3,8}|\d{3,8})$/;
    if (!tripNumberPattern.test(stringValue.trim()) && stringValue.trim() !== '') {
      setValidationMessage('Warning: Trip Number format may be incorrect. Expected format: TR-123456 or 123456');
      // Still allow it but with a warning
    }
  }
  
  if (fieldName === 'driver' && isUnassignedDriver(value)) {
    setValidationMessage('Driver cannot be "Unassigned"');
    return false;
  }
  
  return true;
};
