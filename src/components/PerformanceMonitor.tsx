
"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  getPerformanceReport, 
  getBottlenecks, 
  clearPerformanceLogs 
} from '@/utils/performanceLogger';
import { Activity, FileSearch, Clock, AlertTriangle, Trash2, Download, X, Share2 } from 'lucide-react';

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
  const [activeOperations, setActiveOperations] = useState<string[]>([]);

  // Update report every second when panel is open
  useEffect(() => {
    if (!isOpen) return;
    
    const interval = setInterval(() => {
      setReport(getPerformanceReport());
      setBottlenecks(getBottlenecks(100)); // Operations taking more than 100ms
      
      // Identify active operations (started but not ended)
      const currentReport = getPerformanceReport();
      const active = currentReport.entries
        .filter(entry => !entry.endTime)
        .map(entry => entry.operation);
      setActiveOperations(active);
      
      setUpdateCounter(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleClearLogs = () => {
    clearPerformanceLogs();
    setReport({ totalTime: 0, entries: [] });
    setBottlenecks([]);
  };

  const downloadLogs = () => {
    const data = JSON.stringify(report, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Group entries by category for better organization
  const groupedEntries = report.entries.reduce<Record<string, PerformanceEntry[]>>((acc, entry) => {
    const category = entry.operation.split('.')[0]; // First part of operation name
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(entry);
    return acc;
  }, {});

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 rounded-full w-12 h-12 p-0 flex items-center justify-center"
        variant={activeOperations.length > 0 ? "destructive" : "secondary"}
        size="icon"
        title="Performance Monitor"
      >
        <Activity className="h-5 w-5" />
        {activeOperations.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
            {activeOperations.length}
          </span>
        )}
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-[90vw] md:w-[600px] h-[80vh] z-50 shadow-xl overflow-hidden flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>Performance Monitor</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={downloadLogs} title="Download Logs">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleClearLogs} title="Clear Logs">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} title="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription>
          Real-time performance monitoring and logging
          {activeOperations.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {activeOperations.length} active operations
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      
      <Tabs defaultValue="summary" className="flex-1 flex flex-col">
        <div className="px-6">
          <TabsList className="w-full">
            <TabsTrigger value="summary" className="flex-1 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Summary</span>
            </TabsTrigger>
            <TabsTrigger value="bottlenecks" className="flex-1 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              <span>Bottlenecks</span>
              {bottlenecks.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {bottlenecks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="details" className="flex-1 flex items-center gap-1">
              <FileSearch className="h-4 w-4" />
              <span>Details</span>
            </TabsTrigger>
            <TabsTrigger value="active" className="flex-1 flex items-center gap-1">
              <Share2 className="h-4 w-4" />
              <span>Active</span>
              {activeOperations.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {activeOperations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="summary" className="flex-1 px-6 overflow-hidden flex flex-col">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.entries.length}</div>
                <p className="text-sm text-muted-foreground">
                  Completed: {report.entries.filter(e => e.endTime).length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-sm font-medium">Total Processing Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(report.totalTime / 1000).toFixed(2)}s
                </div>
                <p className="text-sm text-muted-foreground">
                  Avg: {report.entries.length ? (report.totalTime / report.entries.length).toFixed(1) : 0}ms per op
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Card className="flex-1 overflow-hidden">
            <CardHeader className="py-2">
              <CardTitle className="text-sm font-medium">Operation Categories</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100%-40px)]">
                <div className="p-4">
                  {Object.entries(groupedEntries).map(([category, entries]) => {
                    const totalTime = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
                    const avgTime = entries.length ? totalTime / entries.length : 0;
                    const percentOfTotal = report.totalTime ? (totalTime / report.totalTime) * 100 : 0;
                    
                    return (
                      <div key={category} className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-sm font-medium">{category}</h4>
                          <span className="text-xs text-muted-foreground">
                            {entries.length} ops · {(totalTime / 1000).toFixed(2)}s ({percentOfTotal.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full" 
                            style={{ width: `${percentOfTotal}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span>Avg: {avgTime.toFixed(1)}ms per op</span>
                          <span>Max: {Math.max(...entries.map(e => e.duration || 0)).toFixed(1)}ms</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="bottlenecks" className="flex-1 px-6 overflow-hidden">
          <ScrollArea className="h-full">
            {bottlenecks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No bottlenecks detected (operations &gt;100ms)</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bottlenecks.map((entry, i) => (
                  <Card key={i} className="mb-4">
                    <CardHeader className="py-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-medium">{entry.operation}</CardTitle>
                        <Badge variant={entry.duration && entry.duration > 500 ? "destructive" : "secondary"}>
                          {entry.duration?.toFixed(2)}ms
                        </Badge>
                      </div>
                    </CardHeader>
                    {entry.metadata && (
                      <CardContent className="py-0">
                        <div className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-24">
                          <pre>{JSON.stringify(entry.metadata, null, 2)}</pre>
                        </div>
                      </CardContent>
                    )}
                    <CardFooter className="text-xs text-muted-foreground pt-2 pb-3">
                      Start: {new Date(entry.startTime).toISOString()}
                      {entry.endTime && (
                        <span className="ml-2">
                          End: {new Date(entry.endTime).toISOString()}
                        </span>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="details" className="flex-1 px-6 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-4">
              {[...report.entries].reverse().slice(0, 50).map((entry, i) => (
                <Card key={i} className="mb-2">
                  <CardHeader className="py-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-xs font-medium truncate max-w-[70%]">{entry.operation}</CardTitle>
                      {entry.duration ? (
                        <Badge variant={entry.duration > 100 ? "secondary" : "outline"}>
                          {entry.duration.toFixed(2)}ms
                        </Badge>
                      ) : (
                        <Badge variant="destructive">In Progress</Badge>
                      )}
                    </div>
                  </CardHeader>
                  {entry.metadata && (
                    <CardContent className="py-0">
                      <div className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-20">
                        <pre>{JSON.stringify(entry.metadata, null, 2)}</pre>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
              {report.entries.length > 50 && (
                <p className="text-center text-xs text-muted-foreground">
                  Showing 50 of {report.entries.length} entries
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="active" className="flex-1 px-6 overflow-hidden">
          <ScrollArea className="h-full">
            {activeOperations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Share2 className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No active operations</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeOperations.map((operation, i) => {
                  const entry = report.entries.find(e => e.operation === operation && !e.endTime);
                  const elapsedMs = entry ? performance.now() - entry.startTime : 0;
                  
                  return (
                    <Card key={i} className="mb-2 border-destructive">
                      <CardHeader className="py-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-sm font-medium truncate max-w-[70%]">{operation}</CardTitle>
                          <Badge variant="destructive" className="animate-pulse">
                            {elapsedMs.toFixed(0)}ms
                          </Badge>
                        </div>
                      </CardHeader>
                      {entry?.metadata && (
                        <CardContent className="py-0">
                          <div className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-20">
                            <pre>{JSON.stringify(entry.metadata, null, 2)}</pre>
                          </div>
                        </CardContent>
                      )}
                      <CardFooter className="text-xs text-muted-foreground py-2">
                        Started: {entry ? new Date(entry.startTime).toISOString() : 'Unknown'}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
