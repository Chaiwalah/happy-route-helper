
/**
 * Performance and Debug Logger
 * Tracks CSV parsing, data validation, and UI rendering performance
 */

type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'performance';

interface PerformanceEntry {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceLogger {
  private static instance: PerformanceLogger;
  private enabled: boolean = true;
  private performanceEntries: PerformanceEntry[] = [];
  private logPrefix: string = '🔍 [DeliveryTracker]';
  private operations: Map<string, number> = new Map();

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

  public startOperation(operation: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;
    
    const startTime = performance.now();
    this.operations.set(operation, startTime);
    
    this.performanceEntries.push({
      operation,
      startTime,
      metadata
    });
    
    console.log(`${this.logPrefix} ⏱️ Starting: ${operation}`, metadata || '');
  }

  public endOperation(operation: string, additionalMetadata?: Record<string, any>): number {
    if (!this.enabled) return 0;
    
    const endTime = performance.now();
    const startTime = this.operations.get(operation);
    
    if (startTime === undefined) {
      console.warn(`${this.logPrefix} ⚠️ Tried to end operation "${operation}" which was never started`);
      return 0;
    }
    
    const duration = endTime - startTime;
    this.operations.delete(operation);
    
    // Find the entry and update it
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
    
    console.log(`${this.logPrefix} ⏱️ Completed: ${operation} in ${duration.toFixed(2)}ms`, 
      additionalMetadata || '');
    
    return duration;
  }

  public log(level: LogLevel, message: string, data?: any): void {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `${this.logPrefix} [${timestamp}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'debug':
        console.log(`${prefix} ${message}`, data || '');
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

  public logTripNumberProcessing(orderId: string, stage: string, rawValue: any, processedValue: any, decisions: any): void {
    if (!this.enabled) return;
    
    this.log('debug', `Trip Number Processing [${stage}] for ${orderId}`, {
      rawValue,
      processedValue,
      decisions
    });
  }

  public logDriverProcessing(orderId: string, stage: string, rawValue: any, processedValue: any, decisions: any): void {
    if (!this.enabled) return;
    
    this.log('debug', `Driver Processing [${stage}] for ${orderId}`, {
      rawValue,
      processedValue,
      decisions
    });
  }

  public getPerformanceReport(): { totalTime: number, entries: PerformanceEntry[] } {
    const totalTime = this.performanceEntries.reduce((sum, entry) => {
      return sum + (entry.duration || 0);
    }, 0);
    
    return {
      totalTime,
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
  performanceLogger.logTripNumberProcessing(orderId, stage, rawValue, processedValue, decisions);

export const logDriverProcessing = (orderId: string, stage: string, rawValue: any, processedValue: any, decisions: any) => 
  performanceLogger.logDriverProcessing(orderId, stage, rawValue, processedValue, decisions);

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
