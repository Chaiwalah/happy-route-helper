
import { DeliveryOrder } from '@/utils/csvParser';
import { FieldValidationStatus } from './types';
import { isEmptyValue, isUnassignedDriver } from './validationUtils';
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';

/**
 * Process a value that might be an object representation
 */
const processFieldValue = (value: any): string => {
  if (value === undefined || value === null) return '';
  
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return String(value.value || '');
  }
  
  return String(value);
};

/**
 * Get validation status for an order
 */
export const getOrderValidationStatus = (order: DeliveryOrder): 'valid' | 'warning' | 'error' => {
  // Check for trip number issues - most critical
  const tripNumberValue = processFieldValue(order.tripNumber);
  if (isEmptyValue(order.tripNumber) || isNoiseOrTestTripNumber(tripNumberValue)) {
    return 'error';
  }
  
  // Check for driver issues
  const driverValue = processFieldValue(order.driver);
  if (isEmptyValue(order.driver) || isUnassignedDriver(driverValue)) {
    return 'warning';
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
export const getFieldValidationStatus = (fieldName: string, value: string): FieldValidationStatus => {
  // Process the value to handle object representations
  const processedValue = processFieldValue(value);
  
  if (isEmptyValue(processedValue)) {
    // Critical fields
    if (fieldName === 'tripNumber' || 
        fieldName === 'driver' || 
        fieldName === 'pickup' || 
        fieldName === 'dropoff') {
      return 'error';
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
    if (isNoiseOrTestTripNumber(processedValue)) {
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
    return 'error';
  }
  
  return 'valid';
};
