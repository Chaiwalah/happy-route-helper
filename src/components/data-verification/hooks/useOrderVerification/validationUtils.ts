
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
  
  // Check if normalized value is empty
  if (!normalizedValue || normalizedValue.trim() === '') {
    endPerformanceTracking(operationId, { result: true, reason: 'empty after normalization' });
    return true;
  }
  
  // We're not considering special values like 'n/a' as empty anymore
  // They'll be handled separately as "needs verification" status
  
  endPerformanceTracking(operationId, { 
    result: false, 
    reason: 'has value',
    normalizedValue
  });
  
  return false;
};

/**
 * Check if a value is a placeholder that needs verification
 * Values like 'n/a', 'none', etc. are handled here
 */
export const isPlaceholderValue = (value: any): boolean => {
  const operationId = `isPlaceholderValue.${Math.random().toString(36).substr(2, 9)}`;
  startPerformanceTracking(operationId, { valueType: typeof value });
  
  // Null and undefined are not considered placeholders
  if (value === null || value === undefined) {
    endPerformanceTracking(operationId, { result: false, reason: 'null/undefined' });
    return false;
  }
  
  // Normalize the value
  const normalizedValue = normalizeFieldValue(value);
  const trimmedLower = normalizedValue.trim().toLowerCase();
  
  // Check against known placeholder values - EXPANDED list for more thorough checks
  const isPlaceholder = 
    trimmedLower === 'n/a' || 
    trimmedLower === 'na' || 
    trimmedLower === 'none' || 
    trimmedLower === 'null' ||
    trimmedLower === 'undefined' ||
    trimmedLower === '-' ||
    trimmedLower === 'placeholder' ||
    trimmedLower === 'pending' ||
    trimmedLower === 'tbd' ||
    trimmedLower === 'to be determined' ||
    trimmedLower === 'not applicable' ||
    trimmedLower === 'not assigned' ||
    trimmedLower === 'not available';
  
  endPerformanceTracking(operationId, { 
    result: isPlaceholder, 
    reason: isPlaceholder ? 'placeholder value' : 'not a placeholder',
    value: trimmedLower,
    normalizedValue
  });
  
  return isPlaceholder;
};

/**
 * Specific check for unassigned drivers
 * Now distinguishes between null (missing), empty, placeholder, and explicitly "Unassigned"
 */
export const isUnassignedDriver = (value: any): boolean => {
  const operationId = `isUnassignedDriver.${Math.random().toString(36).substr(2, 9)}`;
  startPerformanceTracking(operationId, { valueType: typeof value });
  
  // Null/undefined is not explicitly "Unassigned"
  if (value === null || value === undefined) {
    endPerformanceTracking(operationId, { result: false, reason: 'null/undefined' });
    return false;
  }
  
  // Empty string is not explicitly "Unassigned"
  if (isEmptyValue(value)) {
    endPerformanceTracking(operationId, { result: false, reason: 'empty value' });
    return false;
  }
  
  // Only return true if the value is explicitly "Unassigned"
  const normalizedValue = normalizeFieldValue(value);
  const trimmedLower = normalizedValue.trim().toLowerCase();
  
  // EXPANDED to cover all unassigned variations
  const isUnassigned = 
    trimmedLower === 'unassigned' || 
    trimmedLower === 'not assigned' ||
    trimmedLower === 'no driver' || 
    trimmedLower === 'no_driver' ||
    trimmedLower === 'nodriver';
  
  endPerformanceTracking(operationId, { 
    result: isUnassigned, 
    reason: isUnassigned ? 'explicitly unassigned' : 'not unassigned',
    value: trimmedLower,
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
  
  // Only consider truly missing values (null/undefined/empty)
  // Placeholders like 'N/A' are now handled separately
  const isMissing = value === null || value === undefined || 
                   (typeof value === 'string' && value.trim() === '');
  
  endPerformanceTracking(operationId, { 
    result: isMissing, 
    reason: isMissing ? 'null/undefined/empty' : 'has value',
    valueType: typeof value,
    valuePreview: value === null ? 'null' : String(value).substring(0, 50)
  });
  
  return isMissing;
};

/**
 * Check if driver needs verification (placeholders like 'N/A', 'none', etc.)
 */
export const isDriverNeedsVerification = (value: any): boolean => {
  const operationId = `isDriverNeedsVerification.${Math.random().toString(36).substr(2, 9)}`;
  startPerformanceTracking(operationId, { valueType: typeof value });
  
  // Already missing or explicitly unassigned?
  if (isMissingDriver(value) || isUnassignedDriver(value)) {
    endPerformanceTracking(operationId, { 
      result: false, 
      reason: isMissingDriver(value) ? 'missing driver' : 'explicitly unassigned'
    });
    return false;
  }
  
  // Check if it's a placeholder value
  const needsVerification = isPlaceholderValue(value);
  
  endPerformanceTracking(operationId, { 
    result: needsVerification, 
    reason: needsVerification ? 'placeholder value' : 'valid driver',
    valueType: typeof value,
    valuePreview: value === null ? 'null' : String(value).substring(0, 50)
  });
  
  return needsVerification;
};

/**
 * Validates a field based on field name and value
 * Now distinguishes between missing, placeholder, and valid values
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
      setValidationMessage('Trip Number is missing - Please add a trip number');
      
      logTripNumberProcessing(
        orderId,
        'Validation',
        value,
        null,
        { valid: false, reason: 'Missing (null/undefined)', status: 'MISSING' }
      );
      
      endPerformanceTracking(operationId, { 
        valid: false, 
        reason: 'null/undefined trip number',
        status: 'MISSING'
      });
      
      return false;
    }
    
    if (fieldName === 'driver') {
      setValidationMessage('Driver is missing - Please assign a driver');
      
      logDriverProcessing(
        orderId,
        'Validation',
        value,
        null,
        { valid: false, reason: 'Missing (null/undefined)', status: 'MISSING' }
      );
      
      endPerformanceTracking(operationId, { 
        valid: false, 
        reason: 'null/undefined driver',
        status: 'MISSING'
      });
      
      return false;
    }
  }
  
  // Normalize the value for other validations
  const normalizedValue = normalizeFieldValue(value);
  
  // Handle empty values (but not null/undefined)
  if (isEmptyValue(value) && value !== null && value !== undefined) {
    if (fieldName === 'tripNumber') {
      setValidationMessage('Trip Number cannot be empty - Please enter a trip number');
      
      logTripNumberProcessing(
        orderId,
        'Validation',
        value,
        normalizedValue,
        { valid: false, reason: 'Empty after normalization', status: 'MISSING' }
      );
      
      endPerformanceTracking(operationId, { 
        valid: false, 
        reason: 'empty trip number',
        status: 'MISSING'
      });
      
      return false;
    }
    
    if (fieldName === 'driver') {
      setValidationMessage('Driver cannot be empty - Please assign a driver');
      
      logDriverProcessing(
        orderId,
        'Validation',
        value,
        normalizedValue,
        { valid: false, reason: 'Empty after normalization', status: 'MISSING' }
      );
      
      endPerformanceTracking(operationId, { 
        valid: false, 
        reason: 'empty driver',
        status: 'MISSING'
      });
      
      return false;
    }
  }
  
  // Handle placeholder values that need verification
  if (isPlaceholderValue(value)) {
    if (fieldName === 'tripNumber') {
      setValidationMessage('Trip Number needs verification - "N/A" or similar values need to be replaced');
      
      logTripNumberProcessing(
        orderId,
        'Validation',
        value,
        normalizedValue,
        { valid: false, reason: 'Placeholder value', status: 'NEEDS_VERIFICATION' }
      );
      
      endPerformanceTracking(operationId, { 
        valid: false, 
        reason: 'placeholder trip number',
        status: 'NEEDS_VERIFICATION'
      });
      
      return false;
    }
    
    if (fieldName === 'driver') {
      setValidationMessage('Driver needs verification - "N/A" or similar values need to be replaced');
      
      logDriverProcessing(
        orderId,
        'Validation',
        value,
        normalizedValue,
        { valid: false, reason: 'Placeholder value', status: 'NEEDS_VERIFICATION' }
      );
      
      endPerformanceTracking(operationId, { 
        valid: false, 
        reason: 'placeholder driver',
        status: 'NEEDS_VERIFICATION'
      });
      
      return false;
    }
  }
  
  // Trip Number specific validation
  if (fieldName === 'tripNumber' && !isEmptyValue(value)) {
    // Check for noise/test values using the updated tuple return
    const [isNoise, needsVerification] = isNoiseOrTestTripNumber(normalizedValue);
    
    if (isNoise) {
      setValidationMessage('Warning: This appears to be a test/noise value');
      
      logTripNumberProcessing(
        orderId,
        'Validation',
        value,
        normalizedValue,
        { valid: false, reason: 'Test/noise value', isNoise, needsVerification, status: 'NOISE' }
      );
      
      endPerformanceTracking(operationId, { 
        valid: false, 
        reason: 'noise trip number',
        status: 'NOISE'
      });
      
      return false;
    }
    
    if (needsVerification) {
      setValidationMessage('Trip Number requires verification - Please enter a valid trip number');
      
      logTripNumberProcessing(
        orderId,
        'Validation',
        value,
        normalizedValue,
        { valid: false, reason: 'Needs verification', isNoise, needsVerification, status: 'NEEDS_VERIFICATION' }
      );
      
      endPerformanceTracking(operationId, { 
        valid: false, 
        reason: 'trip number needs verification',
        status: 'NEEDS_VERIFICATION'
      });
      
      return false;
    }
    
    // Validate proper trip number format (e.g. TR-123456)
    const tripNumberPattern = /^([A-Za-z]{1,3}[\-\s]?\d{3,8}|\d{3,8})$/;
    const formatValid = tripNumberPattern.test(normalizedValue.trim());
    
    if (!formatValid) {
      setValidationMessage('Warning: Trip Number format may be incorrect. Expected format: TR-123456 or 123456');
      
      logTripNumberProcessing(
        orderId,
        'Validation',
        value,
        normalizedValue,
        { valid: true, formatWarning: true, pattern: '^([A-Za-z]{1,3}[\\-\\s]?\\d{3,8}|\\d{3,8})$', status: 'WARNING' }
      );
      
      // Still allow it but with a warning
      endPerformanceTracking(operationId, { 
        valid: true, 
        reason: 'invalid format but allowed',
        normalizedValue,
        status: 'WARNING'
      });
      
      return true;
    } else {
      logTripNumberProcessing(
        orderId,
        'Validation',
        value,
        normalizedValue,
        { valid: true, formatValid: true, status: 'VALID' }
      );
      
      endPerformanceTracking(operationId, { 
        valid: true, 
        reason: 'valid trip number',
        normalizedValue,
        status: 'VALID'
      });
      
      return true;
    }
  }
  
  // Driver specific validation
  if (fieldName === 'driver') {
    // Check for explicitly "Unassigned" driver - NOW RETURNS TRUE WITH WARNING
    if (isUnassignedDriver(value)) {
      setValidationMessage('Driver is set to "Unassigned" - consider assigning a specific driver');
      
      logDriverProcessing(
        orderId,
        'Validation',
        value,
        normalizedValue,
        { valid: true, reason: 'Explicitly unassigned but allowed', status: 'WARNING' }
      );
      
      endPerformanceTracking(operationId, { 
        valid: true,
        reason: 'unassigned driver but allowed',
        normalizedValue,
        status: 'WARNING'
      });
      
      return true;
    }
    
    // Check for driver that needs verification (N/A, None, etc.)
    if (isDriverNeedsVerification(value)) {
      setValidationMessage('Driver value needs verification - please enter a valid driver name');
      
      logDriverProcessing(
        orderId,
        'Validation',
        value,
        normalizedValue,
        { valid: false, reason: 'Needs verification', status: 'NEEDS_VERIFICATION' }
      );
      
      endPerformanceTracking(operationId, { 
        valid: false, 
        reason: 'driver needs verification',
        normalizedValue,
        status: 'NEEDS_VERIFICATION'
      });
      
      return false;
    }
    
    // Valid driver that's not empty, not unassigned, and not a placeholder
    if (!isEmptyValue(value) && !isUnassignedDriver(value) && !isDriverNeedsVerification(value)) {
      logDriverProcessing(
        orderId,
        'Validation',
        value,
        normalizedValue,
        { valid: true, status: 'VALID' }
      );
      
      endPerformanceTracking(operationId, { 
        valid: true, 
        reason: 'valid driver',
        normalizedValue,
        status: 'VALID'
      });
      
      return true;
    }
  }
  
  // General case - field is valid
  endPerformanceTracking(operationId, { 
    valid: true, 
    reason: 'passed all validations',
    normalizedValue,
    status: 'VALID'
  });
  
  return true;
};

/**
 * Get a status object for a field based on its validation state
 * Now includes more detailed status categories
 */
export const getFieldStatus = (fieldName: string, value: any): {
  status: 'MISSING' | 'NEEDS_VERIFICATION' | 'NOISE' | 'NEEDS_ASSIGNMENT' | 'WARNING' | 'VALID';
  message: string;
} => {
  // Handle null and undefined values (truly missing)
  if (value === null || value === undefined) {
    return {
      status: 'MISSING',
      message: fieldName === 'tripNumber' 
        ? 'Trip Number is missing' 
        : fieldName === 'driver'
          ? 'Driver is missing'
          : `${fieldName} is missing`
    };
  }
  
  // Handle empty values
  if (isEmptyValue(value)) {
    return {
      status: 'MISSING',
      message: fieldName === 'tripNumber' 
        ? 'Trip Number cannot be empty' 
        : fieldName === 'driver'
          ? 'Driver cannot be empty'
          : `${fieldName} cannot be empty`
    };
  }
  
  // Handle placeholder values
  if (isPlaceholderValue(value)) {
    return {
      status: 'NEEDS_VERIFICATION',
      message: fieldName === 'tripNumber' 
        ? 'Trip Number needs verification' 
        : fieldName === 'driver'
          ? 'Driver needs verification'
          : `${fieldName} needs verification`
    };
  }
  
  // Trip Number specific validation
  if (fieldName === 'tripNumber') {
    const normalizedValue = normalizeFieldValue(value);
    const [isNoise, needsVerification] = isNoiseOrTestTripNumber(normalizedValue);
    
    if (isNoise) {
      return {
        status: 'NOISE',
        message: 'Trip Number appears to be a test/noise value'
      };
    }
    
    if (needsVerification) {
      return {
        status: 'NEEDS_VERIFICATION',
        message: 'Trip Number requires verification'
      };
    }
    
    // Validate proper trip number format
    const tripNumberPattern = /^([A-Za-z]{1,3}[\-\s]?\d{3,8}|\d{3,8})$/;
    const formatValid = tripNumberPattern.test(normalizedValue.trim());
    
    if (!formatValid) {
      return {
        status: 'WARNING',
        message: 'Trip Number format may be incorrect'
      };
    }
  }
  
  // Driver specific validation
  if (fieldName === 'driver') {
    if (isUnassignedDriver(value)) {
      return {
        status: 'NEEDS_ASSIGNMENT',
        message: 'Driver is set to "Unassigned"'
      };
    }
  }
  
  // Valid field
  return {
    status: 'VALID',
    message: 'Valid value'
  };
};
