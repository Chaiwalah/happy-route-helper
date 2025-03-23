
/**
 * Performance and Debug Logger - Optimized Version
 * Minimizes performance impact while providing comprehensive logging
 */

type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'performance';

interface PerformanceEntry {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

// Configuration
const MAX_ENTRIES = 1000; // Maximum entries to keep in memory
const PURGE_THRESHOLD = 800; // When to purge old entries
const DEBUG_MODE = false; // Set to true to enable verbose debugging

class PerformanceLogger {
  private static instance: PerformanceLogger;
  private enabled: boolean = true;
  private performanceEntries: PerformanceEntry[] = [];
  private logPrefix: string = '🔍 [DeliveryTracker]';
  private operations: Map<string, number> = new Map();
  private addressCache: Map<string, [number, number]> = new Map(); // Cache for geocoded addresses
  private inBatchOperation: boolean = false;
  private batchedLogs: string[] = [];
  private operationCounters: Map<string, number> = new Map(); // Count operations by type
  private cacheCounts = { hits: 0, misses: 0 }; // Track cache performance
  
  // Performance data
  private startupTime: number = performance.now();
  private totalProcessingTime: number = 0;
  
  private constructor() {}

  public static getInstance(): PerformanceLogger {
    if (!PerformanceLogger.instance) {
      PerformanceLogger.instance = new PerformanceLogger();
    }
    return PerformanceLogger.instance;
  }

  public enable(): void {
    this.enabled = true;
  }

  public disable(): void {
    this.enabled = false;
  }

  public startBatchOperation(): void {
    this.inBatchOperation = true;
    this.batchedLogs = [];
  }

  public endBatchOperation(): void {
    this.inBatchOperation = false;
    
    // Only log if there are a reasonable number of logs
    if (this.batchedLogs.length > 0 && this.batchedLogs.length < 500) {
      console.log(this.batchedLogs.join('\n'));
    } else if (this.batchedLogs.length >= 500) {
      console.log(`${this.logPrefix} [BATCH] ${this.batchedLogs.length} logs suppressed to prevent console flooding`);
    }
    
    this.batchedLogs = [];
  }

  public startOperation(operation: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;
    
    const startTime = performance.now();
    this.operations.set(operation, startTime);
    
    // Increment operation counter
    const count = this.operationCounters.get(operation) || 0;
    this.operationCounters.set(operation, count + 1);
    
    // Only store entry if we're under the limit
    if (this.performanceEntries.length < MAX_ENTRIES) {
      this.performanceEntries.push({
        operation,
        startTime,
        metadata
      });
    } else if (this.performanceEntries.length >= PURGE_THRESHOLD) {
      // Purge old entries when we hit threshold
      this.performanceEntries = this.performanceEntries.slice(-Math.floor(MAX_ENTRIES / 2));
    }
    
    // Only log at debug level for significant operations
    if (DEBUG_MODE || !this.isHighVolumeOperation(operation)) {
      this.logMessage(`⏱️ Starting: ${operation}`, metadata || '');
    }
  }

  public endOperation(operation: string, additionalMetadata?: Record<string, any>): number {
    if (!this.enabled) return 0;
    
    const endTime = performance.now();
    const startTime = this.operations.get(operation);
    
    if (startTime === undefined) {
      this.logMessage(`⚠️ Tried to end operation "${operation}" which was never started`, null, 'warning');
      return 0;
    }
    
    const duration = endTime - startTime;
    this.operations.delete(operation);
    
    // Only track total processing time for main operations
    if (this.isMainOperation(operation)) {
      this.totalProcessingTime += duration;
    }
    
    // Find the entry and update it (only if we're storing it)
    const entry = this.performanceEntries.find(e => 
      e.operation === operation && e.endTime === undefined
    );
    
    if (entry) {
      entry.endTime = endTime;
      entry.duration = duration;
      if (additionalMetadata) {
        entry.metadata = { ...entry.metadata, ...additionalMetadata };
      }
    }
    
    // Only log at debug level for significant operations or slow operations
    if (DEBUG_MODE || !this.isHighVolumeOperation(operation) || duration > 100) {
      this.logMessage(`⏱️ Completed: ${operation} in ${duration.toFixed(2)}ms`, additionalMetadata || '');
    }
    
    return duration;
  }

  // Helper to identify high-volume operations that would flood logs
  private isHighVolumeOperation(operation: string): boolean {
    return operation.includes('processOrder') || 
           operation.includes('validateField') || 
           operation.includes('normalizeFieldValue') ||
           operation.includes('isEmptyValue');
  }
  
  // Helper to identify main operations for total time tracking
  private isMainOperation(operation: string): boolean {
    return operation.startsWith('calculateDistances') ||
           operation.startsWith('processOrdersForVerification') ||
           operation.startsWith('organizeOrdersIntoRoutes');
  }

  private logMessage(message: string, data: any, level: LogLevel = 'debug'): void {
    if (!this.enabled) return;
    
    const logString = `${this.logPrefix} ${message}`;
    
    if (this.inBatchOperation) {
      this.batchedLogs.push(data ? `${logString} ${JSON.stringify(data)}` : logString);
      return;
    }
    
    if (data) {
      console.log(logString, data);
    } else {
      console.log(logString);
    }
  }

  public log(level: LogLevel, message: string, data?: any): void {
    if (!this.enabled) return;
    
    // Skip low-priority logs when in batch mode
    if (this.inBatchOperation && (level === 'debug' || level === 'info')) {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const prefix = `${this.logPrefix} [${timestamp}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'debug':
        if (DEBUG_MODE) console.log(`${prefix} ${message}`, data || '');
        break;
      case 'info':
        console.info(`${prefix} ${message}`, data || '');
        break;
      case 'warning':
        console.warn(`${prefix} ${message}`, data || '');
        break;
      case 'error':
        console.error(`${prefix} ${message}`, data || '');
        break;
      case 'performance':
        console.log(`${prefix} ⏱️ ${message}`, data || '');
        break;
    }
  }

  // Optimized address caching methods
  public cacheAddress(address: string, coordinates: [number, number]): void {
    this.addressCache.set(address, coordinates);
    this.cacheCounts.hits++;
    
    if (DEBUG_MODE && !this.inBatchOperation) {
      this.log('debug', `Address cached`, { address, coordinates });
    }
  }

  public getCachedAddress(address: string): [number, number] | undefined {
    const result = this.addressCache.get(address);
    
    if (result) {
      this.cacheCounts.hits++;
      if (DEBUG_MODE && !this.inBatchOperation) {
        this.log('debug', `Cache hit for address`, { address });
      }
    } else {
      this.cacheCounts.misses++;
    }
    
    return result;
  }

  public clearAddressCache(): void {
    const cacheSize = this.addressCache.size;
    this.addressCache.clear();
    this.log('info', `Address cache cleared`, { entriesCleared: cacheSize });
  }

  // Performance reporting methods
  public getPerformanceReport(): { 
    totalTime: number,
    totalProcessingTime: number,
    elapsedTime: number,
    operations: Record<string, number>,
    cachePerformance: { hits: number, misses: number, hitRatio: number },
    entries: PerformanceEntry[]
  } {
    const totalTime = this.performanceEntries.reduce((sum, entry) => {
      return sum + (entry.duration || 0);
    }, 0);
    
    const elapsedTime = performance.now() - this.startupTime;
    const operations: Record<string, number> = {};
    
    this.operationCounters.forEach((count, operation) => {
      operations[operation] = count;
    });
    
    const cacheHitRatio = this.cacheCounts.hits + this.cacheCounts.misses === 0 
      ? 0 
      : this.cacheCounts.hits / (this.cacheCounts.hits + this.cacheCounts.misses);
    
    return {
      totalTime,
      totalProcessingTime: this.totalProcessingTime,
      elapsedTime,
      operations,
      cachePerformance: {
        hits: this.cacheCounts.hits,
        misses: this.cacheCounts.misses,
        hitRatio: cacheHitRatio
      },
      entries: [...this.performanceEntries]
    };
  }

  public getBottlenecks(threshold: number = 100): PerformanceEntry[] {
    return this.performanceEntries
      .filter(entry => (entry.duration || 0) > threshold)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0));
  }

  public clearLogs(): void {
    this.performanceEntries = [];
    this.operations.clear();
    this.operationCounters.clear();
  }
  
  // Get cache size and stats
  public getCacheStatus(): { size: number, hits: number, misses: number, hitRatio: number } {
    const hitRatio = this.cacheCounts.hits + this.cacheCounts.misses === 0 
      ? 0 
      : this.cacheCounts.hits / (this.cacheCounts.hits + this.cacheCounts.misses);
      
    return {
      size: this.addressCache.size,
      hits: this.cacheCounts.hits,
      misses: this.cacheCounts.misses,
      hitRatio
    };
  }
}

// Export a singleton instance
export const performanceLogger = PerformanceLogger.getInstance();

// Helper functions for easier use throughout the application
export const startPerformanceTracking = (operation: string, metadata?: Record<string, any>) => 
  performanceLogger.startOperation(operation, metadata);

export const endPerformanceTracking = (operation: string, additionalMetadata?: Record<string, any>) => 
  performanceLogger.endOperation(operation, additionalMetadata);

export const logTripNumberProcessing = (orderId: string, stage: string, rawValue: any, processedValue: any, decisions: any) => 
  DEBUG_MODE ? performanceLogger.log('debug', `Trip Number Processing [${stage}] for ${orderId}`, {
    rawValue,
    processedValue,
    decisions
  }) : null;

export const logDriverProcessing = (orderId: string, stage: string, rawValue: any, processedValue: any, decisions: any) => 
  DEBUG_MODE ? performanceLogger.log('debug', `Driver Processing [${stage}] for ${orderId}`, {
    rawValue,
    processedValue,
    decisions
  }) : null;

export const logDebug = (message: string, data?: any) => 
  performanceLogger.log('debug', message, data);

export const logInfo = (message: string, data?: any) => 
  performanceLogger.log('info', message, data);

export const logWarning = (message: string, data?: any) => 
  performanceLogger.log('warning', message, data);

export const logError = (message: string, data?: any) => 
  performanceLogger.log('error', message, data);

export const logPerformance = (message: string, data?: any) => 
  performanceLogger.log('performance', message, data);

export const getPerformanceReport = () => 
  performanceLogger.getPerformanceReport();

export const getBottlenecks = (threshold?: number) => 
  performanceLogger.getBottlenecks(threshold);

export const clearPerformanceLogs = () => 
  performanceLogger.clearLogs();

// Address caching helpers
export const cacheAddress = (address: string, coordinates: [number, number]) => 
  performanceLogger.cacheAddress(address, coordinates);

export const getCachedAddress = (address: string) => 
  performanceLogger.getCachedAddress(address);

export const clearAddressCache = () => 
  performanceLogger.clearAddressCache();

export const getCacheStatus = () =>
  performanceLogger.getCacheStatus();

// New batch operation helpers
export const startBatchLogging = () => 
  performanceLogger.startBatchOperation();

export const endBatchLogging = () => 
  performanceLogger.endBatchOperation();

// Debug mode control
const DEBUG_MODE = false; // Set to false in production for better performance
