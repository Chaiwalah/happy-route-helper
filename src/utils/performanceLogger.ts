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
  private logEntries: PerformanceEntry[] = [];
  private batchMode: boolean = false;
  private batchStartTime: number | null = null;
  private batchOperationName: string = '';

  // Singleton pattern
  static getInstance(): PerformanceLogger {
    if (!PerformanceLogger.instance) {
      PerformanceLogger.instance = new PerformanceLogger();
    }
    return PerformanceLogger.instance;
  }

  private constructor() {
    this.clearOldEntries();
  }

  private clearOldEntries(): void {
    if (this.logEntries.length > MAX_ENTRIES) {
      // Sort entries by startTime in ascending order
      this.logEntries.sort((a, b) => a.startTime - b.startTime);
      
      // Remove the oldest entries
      this.logEntries.splice(0, this.logEntries.length - PURGE_THRESHOLD);
      this.log('debug', `Purged old entries. Current count: ${this.logEntries.length}`);
    }
  }

  start(operation: string, metadata?: Record<string, any>): void {
    if (this.batchMode) {
      if (!this.batchStartTime) {
        this.batchStartTime = performance.now();
        this.batchOperationName = operation;
      }
      return; // Skip individual logging in batch mode
    }

    const startTime = performance.now();
    this.logEntries.push({ operation, startTime, metadata });
    this.log('debug', `Started: ${operation}`, { startTime, ...metadata });
    this.clearOldEntries();
  }

  end(operation: string, metadata?: Record<string, any>): void {
    if (this.batchMode) {
      return; // Skip individual logging in batch mode
    }

    const endTime = performance.now();
    const entry = this.logEntries.findLast((e) => e.operation === operation && !e.endTime);

    if (entry) {
      entry.endTime = endTime;
      entry.duration = endTime - entry.startTime;
      entry.metadata = { ...entry.metadata, ...metadata };
      this.log('debug', `Ended: ${operation}`, { duration: entry.duration, ...metadata });
    } else {
      this.log('warning', `Mismatched end for operation: ${operation}`);
    }
  }

  record(operation: string, duration: number, metadata?: Record<string, any>): void {
    const startTime = performance.now() - duration;
    const endTime = performance.now();

    this.logEntries.push({ operation, startTime, endTime, duration, metadata });
    this.log('performance', `Recorded: ${operation}`, { duration, ...metadata });
    this.clearOldEntries();
  }

  log(level: LogLevel, message: string, data?: any): void {
    if (!DEBUG_MODE && level === 'debug') return;

    const logData = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      data: data || {}
    };

    switch (level) {
      case 'error':
        console.error(logData);
        break;
      case 'warning':
        console.warn(logData);
        break;
      case 'info':
        console.info(logData);
        break;
      default:
        console.log(logData);
        break;
    }
  }

  getEntries(): PerformanceEntry[] {
    return [...this.logEntries];
  }

  getSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    this.logEntries.forEach(entry => {
      if (summary[entry.operation]) {
        summary[entry.operation].count++;
        summary[entry.operation].totalDuration += entry.duration || 0;
        summary[entry.operation].avgDuration = summary[entry.operation].totalDuration / summary[entry.operation].count;
      } else {
        summary[entry.operation] = {
          count: 1,
          totalDuration: entry.duration || 0,
          avgDuration: entry.duration || 0
        };
      }
    });
    return summary;
  }

  startBatchOperation(): void {
    if (this.batchMode) {
      this.log('warning', 'Batch operation already in progress.');
      return;
    }
    this.batchMode = true;
    this.batchStartTime = null; // Reset start time for the new batch
    this.log('info', 'Batch operation started.');
  }

  endBatchOperation(): void {
    if (!this.batchMode) {
      this.log('warning', 'No batch operation in progress.');
      return;
    }

    this.batchMode = false;
    if (this.batchStartTime) {
      const batchEndTime = performance.now();
      const batchDuration = batchEndTime - this.batchStartTime;
      this.record(this.batchOperationName || 'Batch Operation', batchDuration);
      this.log('info', 'Batch operation ended.', { duration: batchDuration });
      this.batchStartTime = null;
      this.batchOperationName = '';
    } else {
      this.log('warning', 'Batch operation ended without start.');
    }
  }
}

// Export a singleton instance
export const performanceLogger = PerformanceLogger.getInstance();

// Helper functions for performance tracking
export const startPerformanceTracking = (operation: string, metadata?: Record<string, any>) => {
  performanceLogger.start(operation, metadata);
};

export const endPerformanceTracking = (operation: string, metadata?: Record<string, any>) => {
  performanceLogger.end(operation, metadata);
};

export const recordPerformance = (operation: string, duration: number, metadata?: Record<string, any>) => {
  performanceLogger.record(operation, duration, metadata);
};

// Log a message with a specific level
export const logMessage = (level: LogLevel, message: string, data?: any) => {
  performanceLogger.log(level, message, data);
};

// Get all log entries
export const getLogEntries = () => {
  return performanceLogger.getEntries();
};

// Get a summary of the performance data
export const getPerformanceSummary = () => {
  return performanceLogger.getSummary();
};

// New batch operation helpers
export const startBatchLogging = () => 
  performanceLogger.startBatchOperation();

export const endBatchLogging = () => 
  performanceLogger.endBatchOperation();
