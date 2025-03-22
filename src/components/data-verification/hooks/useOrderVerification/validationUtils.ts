
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';

/**
 * Enhanced utility to check if a value is effectively empty
 */
export const isEmptyValue = (value: string | undefined | null): boolean => {
  if (value === undefined || value === null) return true;
  return value.trim() === '' || 
         value.toLowerCase() === 'n/a' || 
         value.toLowerCase() === 'na' || 
         value.toLowerCase() === 'none' || 
         value.trim() === '-';
};

/**
 * Specific check for unassigned drivers
 */
export const isUnassignedDriver = (value: string | undefined | null): boolean => {
  if (value === undefined || value === null) return true;
  return value.trim() === 'Unassigned';
};

/**
 * Validates a field based on field name and value
 */
export const validateField = (
  fieldName: string, 
  value: string,
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
  
  if (fieldName === 'tripNumber') {
    // Check for noise/test values
    if (isNoiseOrTestTripNumber(value)) {
      setValidationMessage('Warning: This appears to be a test/noise value');
      return false;
    }
    
    // Check for N/A values
    if (['n/a', 'na', 'none'].includes(value.toLowerCase())) {
      setValidationMessage('Trip Number cannot be N/A or None');
      return false;
    }
    
    // Validate proper trip number format (e.g. TR-123456)
    const tripNumberPattern = /^([A-Za-z]{1,3}[\-\s]?\d{3,8}|\d{3,8})$/;
    if (!tripNumberPattern.test(value.trim()) && value.trim() !== '') {
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
