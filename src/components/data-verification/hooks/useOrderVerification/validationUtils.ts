
/**
 * Enhanced utilities for validating and normalizing field values
 */

import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';
import {
  startPerformanceTracking,
  endPerformanceTracking,
  logTripNumberProcessing,
  logDriverProcessing
} from '@/utils/performanceLogger';

/**
 * Normalize any field value to a consistent string representation
 * Handles all possible input types including object representations
 */
export const normalizeFieldValue = (value: any): string => {
  const operationId = `normalizeFieldValue.${Math.random().toString(36).substr(2, 9)}`;
  startPerformanceTracking(operationId, { valueType: typeof value });
  
  // Handle null and undefined - these are truly missing values
  if (value === undefined || value === null) {
    endPerformanceTracking(operationId, { result: '', reason: 'null/undefined' });
    return '';
  }
  
  // Handle object with _type property (special case from some parsers)
  if (typeof value === 'object' && value !== null) {
    // First handle the {_type: "undefined"} case
    if (value._type === 'undefined') {
      endPerformanceTracking(operationId, { result: '', reason: '_type:undefined' });
      return '';
    }
    
    // Handle object with value property (common representation)
    if ('value' in value) {
      const objValue = value.value;
      const result = objValue === undefined || objValue === null ? '' : String(objValue);
      endPerformanceTracking(operationId, { result, reason: 'object with value property' });
      return result;
    }
    
    // Handle empty object
    if (Object.keys(value).length === 0) {
      endPerformanceTracking(operationId, { result: '', reason: 'empty object' });
      return '';
    }
    
    // Try to stringify other objects (last resort)
    try {
      const result = String(value);
      endPerformanceTracking(operationId, { result, reason: 'string conversion' });
      return result;
    } catch {
      endPerformanceTracking(operationId, { result: '', reason: 'stringify error' });
      return '';
    }
  }
  
  // For primitive values, convert to string
  const result = String(value);
  endPerformanceTracking(operationId, { result, reason: 'primitive value' });
  return result;
};

/**
 * Check if a value is effectively empty after normalization
 */
export const isEmptyValue = (value: any): boolean => {
  const operationId = `isEmptyValue.${Math.random().toString(36).substr(2, 9)}`;
  startPerformanceTracking(operationId, { valueType: typeof value });
  
  // Null and undefined are always considered empty
  if (value === null || value === undefined) {
    endPerformanceTracking(operationId, { result: true, reason: 'null/undefined' });
    return true;
  }
  
  // Normalize the value first for other cases
  const normalizedValue = normalizeFieldValue(value);
  
  // Check if normalized value is empty or special "empty" values
  if (!normalizedValue) {
    endPerformanceTracking(operationId, { result: true, reason: 'empty after normalization' });
    return true;
  }
  
  const trimmedLower = normalizedValue.trim().toLowerCase();
  const isEmpty = trimmedLower === '' || 
         trimmedLower === 'n/a' || 
         trimmedLower === 'na' || 
         trimmedLower === 'none' || 
         trimmedLower === 'null' ||
         trimmedLower === 'undefined' ||
         trimmedLower === '-';
  
  endPerformanceTracking(operationId, { 
    result: isEmpty, 
    reason: isEmpty ? 'special empty value' : 'has value',
    normalizedValue
  });
  
  return isEmpty;
};

/**
 * Specific check for unassigned drivers
 * Now distinguishes between null (missing) and explicitly set "Unassigned"
 */
export const isUnassignedDriver = (value: any): boolean => {
  const operationId = `isUnassignedDriver.${Math.random().toString(36).substr(2, 9)}`;
  startPerformanceTracking(operationId, { valueType: typeof value });
  
  // Null is considered missing, not unassigned
  if (value === null || value === undefined) {
    endPerformanceTracking(operationId, { result: false, reason: 'null/undefined' });
    return false;
  }
  
  // First normalize the value for string comparison
  const normalizedValue = normalizeFieldValue(value);
  
  // Only return true if the value is explicitly "Unassigned"
  const isUnassigned = normalizedValue.trim().toLowerCase() === 'unassigned';
  
  endPerformanceTracking(operationId, { 
    result: isUnassigned, 
    reason: isUnassigned ? 'explicitly unassigned' : 'not unassigned',
    normalizedValue
  });
  
  return isUnassigned;
};

/**
 * Check if driver is missing (null/undefined or empty)
 */
export const isMissingDriver = (value: any): boolean => {
  const operationId = `isMissingDriver.${Math.random().toString(36).substr(2, 9)}`;
  startPerformanceTracking(operationId, { valueType: typeof value });
  
  const isMissing = value === null || value === undefined || isEmptyValue(value);
  
  endPerformanceTracking(operationId, { 
    result: isMissing, 
    reason: isMissing ? 'null/undefined/empty' : 'has value'
  });
  
  return isMissing;
};

/**
 * Validates a field based on field name and value
 * Now properly distinguishes between missing values and invalid values
 */
export const validateField = (
  fieldName: string, 
  value: any,
  setValidationMessage: (message: string | null) => void,
  orderId: string = 'unknown'
): boolean => {
  const operationId = `validateField.${fieldName}.${orderId}`;
  startPerformanceTracking(operationId, { 
    fieldName, 
    valueType: typeof value,
    valuePreview: value === null ? 'null' : (typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : String(value).substring(0, 50))
  });
  
  // Reset validation message
  setValidationMessage(null);
  
  // Handle null and undefined values (truly missing)
  if (value === null || value === undefined) {
    if (fieldName === 'tripNumber') {
      setValidationMessage('Trip Number is missing');
      
      logTripNumberProcessing(
        orderId,
        'Validation',
        value,
        null,
        { valid: false, reason: 'Missing (null/undefined)' }
      );
      
      endPerformanceTracking(operationId, { 
        valid: false, 
        reason: 'null/undefined trip number'
      });
      
      return false;
    }
    
    if (fieldName === 'driver') {
      setValidationMessage('Driver is missing');
      
      logDriverProcessing(
        orderId,
        'Validation',
        value,
        null,
        { valid: false, reason: 'Missing (null/undefined)' }
      );
      
      endPerformanceTracking(operationId, { 
        valid: false, 
        reason: 'null/undefined driver'
      });
      
      return false;
    }
  }
  
  // Normalize the value for other validations
  const normalizedValue = normalizeFieldValue(value);
  
  if (isEmptyValue(value) && value !== null && value !== undefined) {
    if (fieldName === 'tripNumber') {
      setValidationMessage('Trip Number cannot be empty');
      
      logTripNumberProcessing(
        orderId,
        'Validation',
        value,
        normalizedValue,
        { valid: false, reason: 'Empty after normalization' }
      );
      
      endPerformanceTracking(operationId, { 
        valid: false, 
        reason: 'empty trip number'
      });
      
      return false;
    }
    
    if (fieldName === 'driver') {
      setValidationMessage('Driver cannot be empty');
      
      logDriverProcessing(
        orderId,
        'Validation',
        value,
        normalizedValue,
        { valid: false, reason: 'Empty after normalization' }
      );
      
      endPerformanceTracking(operationId, { 
        valid: false, 
        reason: 'empty driver'
      });
      
      return false;
    }
  }
  
  if (fieldName === 'tripNumber' && !isEmptyValue(value)) {
    // Check for noise/test values using the updated tuple return
    const [isNoise, isMissing] = isNoiseOrTestTripNumber(normalizedValue);
    
    if (isNoise) {
      setValidationMessage('Warning: This appears to be a test/noise value');
      
      logTripNumberProcessing(
        orderId,
        'Validation',
        value,
        normalizedValue,
        { valid: false, reason: 'Test/noise value', isNoise, isMissing }
      );
      
      endPerformanceTracking(operationId, { 
        valid: false, 
        reason: 'noise trip number'
      });
      
      return false;
    }
    
    if (isMissing) {
      setValidationMessage('Trip Number cannot be N/A or None');
      
      logTripNumberProcessing(
        orderId,
        'Validation',
        value,
        normalizedValue,
        { valid: false, reason: 'N/A or None placeholder', isNoise, isMissing }
      );
      
      endPerformanceTracking(operationId, { 
        valid: false, 
        reason: 'missing trip number (N/A)'
      });
      
      return false;
    }
    
    // Validate proper trip number format (e.g. TR-123456)
    const tripNumberPattern = /^([A-Za-z]{1,3}[\-\s]?\d{3,8}|\d{3,8})$/;
    const formatValid = tripNumberPattern.test(normalizedValue.trim()) || normalizedValue.trim() === '';
    
    if (!formatValid) {
      setValidationMessage('Warning: Trip Number format may be incorrect. Expected format: TR-123456 or 123456');
      
      logTripNumberProcessing(
        orderId,
        'Validation',
        value,
        normalizedValue,
        { valid: true, formatWarning: true, pattern: '^([A-Za-z]{1,3}[\\-\\s]?\\d{3,8}|\\d{3,8})$' }
      );
      
      // Still allow it but with a warning
      endPerformanceTracking(operationId, { 
        valid: true, 
        reason: 'invalid format but allowed',
        normalizedValue
      });
    } else {
      logTripNumberProcessing(
        orderId,
        'Validation',
        value,
        normalizedValue,
        { valid: true, formatValid: true }
      );
      
      endPerformanceTracking(operationId, { 
        valid: true, 
        reason: 'valid trip number',
        normalizedValue
      });
    }
  }
  
  if (fieldName === 'driver' && isUnassignedDriver(value)) {
    setValidationMessage('Driver is set to "Unassigned" - please assign a driver');
    
    logDriverProcessing(
      orderId,
      'Validation',
      value,
      normalizedValue,
      { valid: false, reason: 'Explicitly unassigned' }
    );
    
    endPerformanceTracking(operationId, { 
      valid: false, 
      reason: 'unassigned driver',
      normalizedValue
    });
    
    return false;
  }
  
  if (fieldName === 'driver' && !isEmptyValue(value) && !isUnassignedDriver(value)) {
    logDriverProcessing(
      orderId,
      'Validation',
      value,
      normalizedValue,
      { valid: true }
    );
  }
  
  endPerformanceTracking(operationId, { 
    valid: true, 
    reason: 'passed all validations',
    normalizedValue
  });
  
  return true;
};

/**
 * Exports the legacy processFieldValue name for backward compatibility
 * but uses the new normalizeFieldValue implementation
 */
export const processFieldValue = normalizeFieldValue;
