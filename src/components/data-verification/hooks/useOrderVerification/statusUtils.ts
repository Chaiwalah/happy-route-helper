
/**
 * Status utilities for order and field validation
 */

import { DeliveryOrder } from '@/utils/csvParser';
import { FieldValidationStatus } from './types';
import { isEmptyValue, isUnassignedDriver, isPlaceholderValue, normalizeFieldValue } from './validationUtils';
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';
import { startPerformanceTracking, endPerformanceTracking } from '@/utils/performanceLogger';

/**
 * Get validation status for an entire order
 */
export const getOrderValidationStatus = (
  order: DeliveryOrder | null
): 'valid' | 'warning' | 'error' => {
  if (!order) return 'valid';
  
  const operationId = `getOrderValidationStatus.${order.id || 'unknown'}`;
  startPerformanceTracking(operationId);
  
  // Check if order has any missing fields
  if (order.missingFields && order.missingFields.length > 0) {
    endPerformanceTracking(operationId, { result: 'error', missingFields: order.missingFields });
    return 'error';
  }
  
  // Check specific fields with warning status
  if (order.driver && isUnassignedDriver(order.driver)) {
    endPerformanceTracking(operationId, { result: 'warning', reason: 'unassigned driver' });
    return 'warning';
  }
  
  // Check if this is a test/noise order
  if (order.isNoise) {
    endPerformanceTracking(operationId, { result: 'warning', reason: 'test/noise order' });
    return 'warning';
  }
  
  endPerformanceTracking(operationId, { result: 'valid' });
  return 'valid';
};

/**
 * Get validation status for a specific field
 * This is a critical function that determines how fields are displayed in the UI
 */
export const getFieldValidationStatus = (
  fieldName: string,
  fieldValue: string | null
): FieldValidationStatus => {
  const operationId = `getFieldValidationStatus.${fieldName}`;
  startPerformanceTracking(operationId);
  
  // Handle null values (truly missing)
  if (fieldValue === null) {
    endPerformanceTracking(operationId, { result: 'error', reason: 'null value' });
    return 'error';
  }
  
  // Handle empty strings
  if (isEmptyValue(fieldValue)) {
    endPerformanceTracking(operationId, { result: 'error', reason: 'empty value' });
    return 'error';
  }
  
  // Normalize the value
  const normalizedValue = normalizeFieldValue(fieldValue);
  
  // Handle placeholder values
  if (isPlaceholderValue(fieldValue)) {
    endPerformanceTracking(operationId, { result: 'error', reason: 'placeholder value' });
    return 'error';
  }
  
  // Trip Number specific validation
  if (fieldName === 'tripNumber') {
    const [isNoise, needsVerification] = isNoiseOrTestTripNumber(normalizedValue);
    
    if (isNoise) {
      endPerformanceTracking(operationId, { result: 'error', reason: 'noise value' });
      return 'error';
    }
    
    if (needsVerification) {
      endPerformanceTracking(operationId, { result: 'error', reason: 'needs verification' });
      return 'error';
    }
    
    // Check format
    const tripNumberPattern = /^([A-Za-z]{1,3}[\-\s]?\d{3,8}|\d{3,8})$/;
    if (!tripNumberPattern.test(normalizedValue.trim())) {
      endPerformanceTracking(operationId, { result: 'warning', reason: 'unusual format' });
      return 'warning';
    }
  }
  
  // Driver specific validation - CRITICAL FIX
  if (fieldName === 'driver' && isUnassignedDriver(fieldValue)) {
    endPerformanceTracking(operationId, { result: 'warning', reason: 'unassigned driver' });
    return 'warning'; // Changed from 'error' to 'warning'
  }
  
  // Valid field
  endPerformanceTracking(operationId, { result: 'valid' });
  return 'valid';
};
