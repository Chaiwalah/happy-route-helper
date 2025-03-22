
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';

/**
 * Enhanced utility to check if a value is effectively empty
 */
export const isEmptyValue = (value: any): boolean => {
  // Check for undefined or null
  if (value === undefined || value === null) return true;
  
  // Check for objects with _type property set to "undefined"
  if (typeof value === 'object' && value !== null) {
    // Check for object representation of undefined
    if (value._type === 'undefined') return true;
    
    // Check for object with empty or undefined value property
    if ('value' in value) {
      const objValue = value.value;
      if (objValue === undefined || 
          objValue === null || 
          objValue === 'undefined' || 
          (typeof objValue === 'string' && objValue.trim() === '')) {
        return true;
      }
    }
    
    // Check for empty object
    if (Object.keys(value).length === 0) return true;
  }
  
  // If it's a string, check if it's empty or special "empty" values
  if (typeof value === 'string') {
    const trimmedValue = value.trim().toLowerCase();
    return trimmedValue === '' || 
           trimmedValue === 'n/a' || 
           trimmedValue === 'na' || 
           trimmedValue === 'none' || 
           trimmedValue === 'null' ||
           trimmedValue === 'undefined' ||
           trimmedValue === '-';
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
    return value.trim().toLowerCase() === 'unassigned';
  }
  
  // Check for object with value property equal to "Unassigned"
  if (typeof value === 'object' && value !== null && 'value' in value) {
    const objValue = value.value;
    if (typeof objValue === 'string') {
      return objValue.trim().toLowerCase() === 'unassigned';
    }
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
  
  // Handle object representation of values
  let processedValue = value;
  if (typeof value === 'object' && value !== null && 'value' in value) {
    processedValue = value.value;
  }
  
  if (isEmptyValue(processedValue)) {
    if (fieldName === 'tripNumber') {
      setValidationMessage('Trip Number cannot be empty');
      return false;
    }
    
    if (fieldName === 'driver') {
      setValidationMessage('Driver cannot be empty');
      return false;
    }
  }
  
  if (fieldName === 'tripNumber' && !isEmptyValue(processedValue)) {
    // Make sure value is treated as a string
    const stringValue = String(typeof processedValue === 'object' ? 
      (processedValue as any)?.value || '' : processedValue || '');
    
    // Check for noise/test values
    if (isNoiseOrTestTripNumber(stringValue)) {
      setValidationMessage('Warning: This appears to be a test/noise value');
      return false;
    }
    
    // Check for N/A values
    if (['n/a', 'na', 'none', 'null', 'undefined'].includes(stringValue.toLowerCase())) {
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
  
  if (fieldName === 'driver' && isUnassignedDriver(processedValue)) {
    setValidationMessage('Driver cannot be "Unassigned"');
    return false;
  }
  
  return true;
};
