
"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  getPerformanceReport, 
  getBottlenecks, 
  clearPerformanceLogs 
} from '@/utils/performanceLogger';
import { Activity, FileSearch, Clock, AlertTriangle, Trash2, Download } from 'lucide-react';

interface PerformanceEntry {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export function PerformanceMonitor() {
  const [isOpen, setIsOpen] = useState(false);
  const [report, setReport] = useState<{ totalTime: number, entries: PerformanceEntry[] }>({ totalTime: 0, entries: [] });
  const [bottlenecks, setBottlenecks] = useState<PerformanceEntry[]>([]);
  const [updateCounter, setUpdateCounter] = useState(0);

  // Update report every second when panel is open
  useEffect(() => {
    if (!isOpen) return;
    
    const interval = setInterval(() => {
      setReport(getPerformanceReport());
      setBottlenecks(getBottlenecks(50)); // Operations taking more than 50ms
      setUpdateCounter(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleClearLogs = () => {
    clearPerformanceLogs();
    setReport({ totalTime: 0, entries: [] });
    setBottlenecks([]);
  };

  const handleExportLogs = () => {
    const logData = JSON.stringify(report, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-log-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Group entries by operation type
  const groupedEntries = report.entries.reduce((acc, entry) => {
    const category = entry.operation.split('.')[0];
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(entry);
    return acc;
  }, {} as Record<string, PerformanceEntry[]>);

  // Count entries by type
  const categoryCounts = Object.entries(groupedEntries).map(([category, entries]) => ({
    category,
    count: entries.length,
    totalTime: entries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
  })).sort((a, b) => b.totalTime - a.totalTime);

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-4 right-4 z-50"
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(true)}
      >
        <Activity className="h-4 w-4 mr-2" />
        Performance Monitor
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-[600px] h-[500px] z-50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg flex items-center">
              <Activity className="h-5 w-5 mr-2 text-primary" />
              Performance Monitor
            </CardTitle>
            <CardDescription>
              Tracking performance for {report.entries.length} operations
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsOpen(false)}
          >
            Close
          </Button>
        </div>
      </CardHeader>
      <Tabs defaultValue="summary">
        <div className="px-4">
          <TabsList className="w-full">
            <TabsTrigger value="summary" className="flex-1">
              <Clock className="h-4 w-4 mr-2" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="bottlenecks" className="flex-1">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Bottlenecks ({bottlenecks.length})
            </TabsTrigger>
            <TabsTrigger value="details" className="flex-1">
              <FileSearch className="h-4 w-4 mr-2" />
              Details
            </TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="pt-3 px-0">
          <TabsContent value="summary" className="m-0">
            <div className="px-4 pb-3">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-primary/10 rounded-md p-3">
                  <div className="text-sm font-medium text-muted-foreground">Total Time</div>
                  <div className="text-2xl font-bold">{report.totalTime.toFixed(2)}ms</div>
                </div>
                <div className="bg-primary/10 rounded-md p-3">
                  <div className="text-sm font-medium text-muted-foreground">Operations</div>
                  <div className="text-2xl font-bold">{report.entries.length}</div>
                </div>
                <div className="bg-primary/10 rounded-md p-3">
                  <div className="text-sm font-medium text-muted-foreground">Avg Time</div>
                  <div className="text-2xl font-bold">
                    {report.entries.length ? 
                      (report.totalTime / report.entries.length).toFixed(2) : 
                      '0.00'}ms
                  </div>
                </div>
              </div>
              
              <h3 className="font-medium mb-2">Operation Categories</h3>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {categoryCounts.map(category => (
                    <div 
                      key={category.category}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                    >
                      <div>
                        <div className="font-medium">{category.category}</div>
                        <div className="text-sm text-muted-foreground">
                          {category.count} operations
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{category.totalTime.toFixed(2)}ms</div>
                        <div className="text-sm text-muted-foreground">
                          {(category.totalTime / report.totalTime * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
          
          <TabsContent value="bottlenecks" className="m-0">
            <div className="px-4">
              <h3 className="font-medium mb-2">Performance Bottlenecks (>50ms)</h3>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {bottlenecks.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No significant bottlenecks detected
                    </div>
                  ) : (
                    bottlenecks.map((entry, index) => (
                      <div 
                        key={`${entry.operation}-${index}`}
                        className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                      >
                        <div className="font-medium">{entry.operation}</div>
                        <div className="text-sm flex justify-between items-center">
                          <span>{entry.duration?.toFixed(2)}ms</span>
                          {entry.metadata && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => console.log('Metadata:', entry.metadata)}
                            >
                              View Details
                            </Button>
                          )}
                        </div>
                        {entry.metadata && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {Object.entries(entry.metadata)
                              .filter(([, value]) => typeof value !== 'object')
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(', ')}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
          
          <TabsContent value="details" className="m-0">
            <div className="px-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">All Operations</h3>
                <div className="text-sm text-muted-foreground">
                  Last updated {updateCounter} seconds ago
                </div>
              </div>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-1">
                  {report.entries
                    .filter(e => e.duration !== undefined)
                    .sort((a, b) => (b.duration || 0) - (a.duration || 0))
                    .map((entry, index) => (
                      <div 
                        key={`${entry.operation}-${index}`}
                        className="p-2 text-sm rounded-md bg-muted/50 flex justify-between"
                      >
                        <div className="truncate" style={{ maxWidth: '70%' }}>
                          {entry.operation}
                        </div>
                        <div className={`font-mono ${(entry.duration || 0) > 100 ? 'text-red-500' : (entry.duration || 0) > 50 ? 'text-amber-500' : ''}`}>
                          {entry.duration?.toFixed(2)}ms
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </CardContent>
        
        <CardFooter className="justify-between border-t px-6 py-3">
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleClearLogs}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Logs
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportLogs}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
        </CardFooter>
      </Tabs>
    </Card>
  );
}
