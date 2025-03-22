import { DeliveryOrder } from '@/utils/csvParser';
import { FieldValidationStatus } from './types';
import { isEmptyValue, isUnassignedDriver } from './validationUtils';
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';

/**
 * Get validation status for an order
 */
export const getOrderValidationStatus = (order: DeliveryOrder): 'valid' | 'warning' | 'error' => {
  // Check for trip number issues - most critical
  if (isEmptyValue(order.tripNumber) || isNoiseOrTestTripNumber(order.tripNumber || '')) {
    return 'error';
  }
  
  // Check for driver issues
  if (isEmptyValue(order.driver) || isUnassignedDriver(order.driver)) {
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
  if (isEmptyValue(value)) {
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
    if (value.toLowerCase() === 'n/a' || value.toLowerCase() === 'na' || value.toLowerCase() === 'none') {
      return 'error';
    }
    
    // Check for noise/test values
    if (isNoiseOrTestTripNumber(value)) {
      return 'error';
    }
    
    // Validate proper trip number format (e.g. TR-123456)
    const tripNumberPattern = /^([A-Za-z]{1,3}[\-\s]?\d{3,8}|\d{3,8})$/;
    if (!tripNumberPattern.test(value.trim())) {
      return 'warning';
    }
  }
  
  // Driver should not be "Unassigned"
  if (fieldName === 'driver' && isUnassignedDriver(value)) {
    return 'error';
  }
  
  return 'valid';
};
