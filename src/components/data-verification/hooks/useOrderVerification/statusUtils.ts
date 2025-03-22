
import { DeliveryOrder } from '@/utils/csvParser';
import { FieldValidationStatus } from './types';
import { isEmptyValue, isUnassignedDriver, isMissingDriver, normalizeFieldValue } from './validationUtils';
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';

/**
 * Process a value that might be an object representation - now uses normalizeFieldValue
 */
export const processFieldValue = normalizeFieldValue;

/**
 * Get validation status for an order
 */
export const getOrderValidationStatus = (order: DeliveryOrder): 'valid' | 'warning' | 'error' => {
  // Check for trip number issues - most critical
  if (order.tripNumber === null) {
    return 'error'; // Missing trip number
  }
  
  const tripNumberValue = normalizeFieldValue(order.tripNumber);
  if (isEmptyValue(order.tripNumber)) {
    return 'error';
  }
  
  // Use the new tuple return from isNoiseOrTestTripNumber
  const [isNoise] = isNoiseOrTestTripNumber(tripNumberValue);
  if (isNoise) {
    return 'error';
  }
  
  // Check for driver issues - now properly distinguishes missing vs unassigned
  if (order.driver === null) {
    return 'warning'; // Missing driver
  }
  
  const driverValue = normalizeFieldValue(order.driver);
  if (isUnassignedDriver(order.driver)) {
    return 'warning'; // Explicitly set to "Unassigned"
  }
  
  if (isMissingDriver(order.driver)) {
    return 'warning'; // Empty or invalid driver value
  }
  
  // Check for other missing fields - less critical
  if (order.missingFields && order.missingFields.length > 0) {
    // Missing address is an error
    if (order.missingFields.includes('address') || order.missingFields.includes('pickupLocation')) {
      return 'error';
    }
    
    // Other missing fields are warnings
    return 'warning';
  }
  
  return 'valid';
};

/**
 * Get validation status for a specific field
 */
export const getFieldValidationStatus = (fieldName: string, value: string | null): FieldValidationStatus => {
  // Handle null values specifically - these are truly missing
  if (value === null) {
    if (fieldName === 'tripNumber') return 'error';
    if (fieldName === 'driver') return 'error';
    if (fieldName === 'pickup' || fieldName === 'dropoff') return 'error';
    return 'warning';
  }
  
  // For non-null values, normalize and validate
  const processedValue = normalizeFieldValue(value);
  
  if (isEmptyValue(processedValue)) {
    // Critical fields
    if (fieldName === 'tripNumber' || 
        fieldName === 'pickup' || 
        fieldName === 'dropoff') {
      return 'error';
    }
    
    // Special case for driver - distinguish between "Unassigned" (warning) and empty (error)
    if (fieldName === 'driver') {
      return processedValue.toLowerCase() === 'unassigned' ? 'warning' : 'error';
    }
    
    // Optional fields
    return 'warning';
  }
  
  // Check for trip number specific validation
  if (fieldName === 'tripNumber') {
    // 'N/A' values should be treated as missing (error)
    const lowerValue = processedValue.toLowerCase();
    if (lowerValue === 'n/a' || 
        lowerValue === 'na' || 
        lowerValue === 'none' || 
        lowerValue === 'null' || 
        lowerValue === 'undefined') {
      return 'error';
    }
    
    // Check for noise/test values
    const [isNoise] = isNoiseOrTestTripNumber(processedValue);
    if (isNoise) {
      return 'error';
    }
    
    // Validate proper trip number format (e.g. TR-123456)
    const tripNumberPattern = /^([A-Za-z]{1,3}[\-\s]?\d{3,8}|\d{3,8})$/;
    if (!tripNumberPattern.test(processedValue.trim())) {
      return 'warning';
    }
  }
  
  // Driver should not be "Unassigned"
  if (fieldName === 'driver' && isUnassignedDriver(processedValue)) {
    return 'warning'; // Changed from error to warning
  }
  
  return 'valid';
};
