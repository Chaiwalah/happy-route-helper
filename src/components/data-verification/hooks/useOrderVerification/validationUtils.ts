
/**
 * Enhanced utilities for validating and normalizing field values
 */

import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';

/**
 * Normalize any field value to a consistent string representation
 * Handles all possible input types including object representations
 */
export const normalizeFieldValue = (value: any): string => {
  // Handle undefined or null
  if (value === undefined || value === null) return '';
  
  // Handle object with _type property (special case from some parsers)
  if (typeof value === 'object' && value !== null) {
    // First handle the {_type: "undefined"} case
    if (value._type === 'undefined') return '';
    
    // Handle object with value property (common representation)
    if ('value' in value) {
      const objValue = value.value;
      return objValue === undefined || objValue === null ? '' : String(objValue);
    }
    
    // Handle empty object
    if (Object.keys(value).length === 0) return '';
    
    // Try to stringify other objects (last resort)
    try {
      return String(value);
    } catch {
      return '';
    }
  }
  
  // For primitive values, convert to string
  return String(value);
};

/**
 * Check if a value is effectively empty after normalization
 */
export const isEmptyValue = (value: any): boolean => {
  // Normalize the value first
  const normalizedValue = normalizeFieldValue(value);
  
  // Check if normalized value is empty or special "empty" values
  if (!normalizedValue) return true;
  
  const trimmedLower = normalizedValue.trim().toLowerCase();
  return trimmedLower === '' || 
         trimmedLower === 'n/a' || 
         trimmedLower === 'na' || 
         trimmedLower === 'none' || 
         trimmedLower === 'null' ||
         trimmedLower === 'undefined' ||
         trimmedLower === '-';
};

/**
 * Specific check for unassigned drivers
 */
export const isUnassignedDriver = (value: any): boolean => {
  // First normalize the value
  const normalizedValue = normalizeFieldValue(value);
  
  // Check if it's empty (which is effectively unassigned)
  if (isEmptyValue(normalizedValue)) return true;
  
  // Check specifically for the string "Unassigned"
  return normalizedValue.trim().toLowerCase() === 'unassigned';
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
  
  // Normalize the value first for consistent handling
  const normalizedValue = normalizeFieldValue(value);
  
  if (isEmptyValue(normalizedValue)) {
    if (fieldName === 'tripNumber') {
      setValidationMessage('Trip Number cannot be empty');
      return false;
    }
    
    if (fieldName === 'driver') {
      setValidationMessage('Driver cannot be empty');
      return false;
    }
  }
  
  if (fieldName === 'tripNumber' && !isEmptyValue(normalizedValue)) {
    // Check for noise/test values
    if (isNoiseOrTestTripNumber(normalizedValue)) {
      setValidationMessage('Warning: This appears to be a test/noise value');
      return false;
    }
    
    // Check for N/A values
    if (['n/a', 'na', 'none', 'null', 'undefined'].includes(normalizedValue.toLowerCase())) {
      setValidationMessage('Trip Number cannot be N/A or None');
      return false;
    }
    
    // Validate proper trip number format (e.g. TR-123456)
    const tripNumberPattern = /^([A-Za-z]{1,3}[\-\s]?\d{3,8}|\d{3,8})$/;
    if (!tripNumberPattern.test(normalizedValue.trim()) && normalizedValue.trim() !== '') {
      setValidationMessage('Warning: Trip Number format may be incorrect. Expected format: TR-123456 or 123456');
      // Still allow it but with a warning
    }
  }
  
  if (fieldName === 'driver' && isUnassignedDriver(normalizedValue)) {
    setValidationMessage('Driver cannot be "Unassigned"');
    return false;
  }
  
  return true;
};

/**
 * Exports the legacy processFieldValue name for backward compatibility
 * but uses the new normalizeFieldValue implementation
 */
export const processFieldValue = normalizeFieldValue;
