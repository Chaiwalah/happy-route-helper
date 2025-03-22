"use client"

import React, { useState, useEffect } from 'react';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeliveryOrder } from '@/utils/csvParser';
import { 
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { optimizeRoutes, getMockDriverSchedules, OptimizationResult } from '@/utils/timeAnalyzer';
import { enhanceOrdersWithTimeData, ExtendedDeliveryOrder } from '@/utils/dispatchTypes';
import { 
  Clock, 
  AlertTriangle, 
  Search, 
  Users, 
  Route, 
  TrendingDown, 
  Flag,
  Timer
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

interface DispatcherInvestigationProps {
  orders: DeliveryOrder[];
}

export function DispatcherInvestigation({ orders }: DispatcherInvestigationProps) {
  const [enhancedOrders, setEnhancedOrders] = useState<ExtendedDeliveryOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline');

  useEffect(() => {
    if (orders.length > 0) {
      // Enhance orders with mock time data for demo purposes
      const enhanced = enhanceOrdersWithTimeData(orders);
      setEnhancedOrders(enhanced);
    }
  }, [orders]);

  const groupOrdersByDate = () => {
    const groups: Record<string, ExtendedDeliveryOrder[]> = {};
    
    enhancedOrders.forEach(order => {
      if (order.createdAt) {
        const date = order.createdAt.split('T')[0];
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(order);
      }
    });
    
    return groups;
  };
  
  const ordersByDate = groupOrdersByDate();
  const dates = Object.keys(ordersByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const filteredOrders = enhancedOrders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    const createdDate = order.createdAt ? order.createdAt.split('T')[0] : '';
    
    return (
      createdDate === selectedDate &&
      ((order.driver?.toLowerCase() || '').includes(searchLower) ||
       (order.pickup?.toLowerCase() || '').includes(searchLower) ||
       (order.dropoff?.toLowerCase() || '').includes(searchLower) ||
       (order.dispatcher?.toLowerCase() || '').includes(searchLower) ||
       (order.id?.toLowerCase() || '').includes(searchLower))
    );
  });

  const handleOptimizeRoutes = (date: string) => {
    setIsOptimizing(true);
    setSelectedDate(date);
    
    // Simulate API call delay
    setTimeout(() => {
      try {
        const ordersForDate = ordersByDate[date] || [];
        const driverSchedules = getMockDriverSchedules(new Date(date));
        
        const result = optimizeRoutes(ordersForDate, driverSchedules);
        setOptimizationResult(result);
        
        toast({
          description: `Optimization complete: ${result.distanceSaved.toFixed(1)} miles potential savings`,
        });
      } catch (error) {
        console.error('Error optimizing routes:', error);
        toast({
          title: "Optimization failed",
          description: "There was an error optimizing the routes",
          variant: "destructive",
        });
      } finally {
        setIsOptimizing(false);
        setActiveTab('optimization');
      }
    }, 1500);
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
      return format(new Date(isoString), 'h:mm a');
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
      return format(new Date(isoString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const calculateTimeDiff = (start?: string, end?: string) => {
    if (!start || !end) return 'N/A';
    
    try {
      const startTime = new Date(start).getTime();
      const endTime = new Date(end).getTime();
      const diffMinutes = Math.round((endTime - startTime) / (1000 * 60));
      
      if (diffMinutes < 60) {
        return `${diffMinutes} min`;
      } else {
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        return `${hours}h ${minutes}m`;
      }
    } catch (e) {
      return 'Invalid Time';
    }
  };

  const getPriorityBadgeVariant = (priority?: string) => {
    switch (priority) {
      case 'STAT': return 'destructive';
      case 'High': return 'default';
      case 'Medium': return 'secondary';
      case 'Low': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="w-full space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-medium flex items-center gap-2">
            <Search size={20} /> Dispatcher Investigation
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Analyze dispatch decisions and optimize routes
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Input 
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
      </div>
      
      <div className="flex gap-4">
        <div className="w-[180px] shrink-0">
          <div className="rounded-md border p-4 glass-card subtle-shadow">
            <h3 className="text-sm font-medium mb-2">Order Dates</h3>
            <Separator className="my-2" />
            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="space-y-2 pr-2">
                {dates.length > 0 ? (
                  dates.map(date => (
                    <Button
                      key={date}
                      variant={date === selectedDate ? "default" : "outline"}
                      size="sm"
                      className="w-full justify-between"
                      onClick={() => setSelectedDate(date)}
                    >
                      <span>{format(new Date(date), 'MMM d, yyyy')}</span>
                      <span className="text-xs opacity-80">{ordersByDate[date].length}</span>
                    </Button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-2">No order data available</p>
                )}
              </div>
            </ScrollArea>

            {selectedDate && (
              <div className="mt-4 space-y-2">
                <Separator className="my-2" />
                <Button 
                  onClick={() => handleOptimizeRoutes(selectedDate)}
                  className="w-full"
                  size="sm"
                  disabled={isOptimizing || !ordersByDate[selectedDate]?.length}
                >
                  <Route className="mr-1" size={16} />
                  {isOptimizing ? 'Optimizing...' : 'Re-Optimize Routes'}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-10">
              <TabsTrigger value="timeline">
                <Clock size={16} className="mr-1" /> Timeline View
              </TabsTrigger>
              <TabsTrigger value="drivers">
                <Users size={16} className="mr-1" /> Driver Schedules
              </TabsTrigger>
              <TabsTrigger value="optimization">
                <TrendingDown size={16} className="mr-1" /> Route Optimization
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="space-y-4 mt-4">
              {filteredOrders.length > 0 ? (
                <div className="rounded-md border glass-card subtle-shadow">
                  <div className="max-h-[calc(100vh-350px)] overflow-auto">
                    <Table>
                      <TableHeader className="bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-[80px]">ID</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Assigned</TableHead>
                          <TableHead>Assignment Time</TableHead>
                          <TableHead>Pickup/Delivery</TableHead>
                          <TableHead>Dispatcher</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order, index) => (
                          <TableRow 
                            key={order.id}
                            className={`${order.hasSuspiciousDelay ? 'bg-red-50/30 dark:bg-red-900/10' : index % 2 === 0 ? 'bg-white/50 dark:bg-gray-950/20' : 'bg-gray-50/50 dark:bg-gray-900/10'} transition-all`}
                          >
                            <TableCell className="font-mono text-xs">
                              {order.id}
                              {order.hasSuspiciousDelay && (
                                <Flag size={14} className="inline-block ml-1 text-red-500" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getPriorityBadgeVariant(order.priority)}>
                                {order.priority || 'Normal'}
                              </Badge>
                            </TableCell>
                            <TableCell>{order.driver || 'Unassigned'}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatTime(order.createdAt)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatTime(order.assignedAt)}
                            </TableCell>
                            <TableCell>
                              {calculateTimeDiff(order.createdAt, order.assignedAt)}
                              {order.hasSuspiciousDelay && (
                                <span className="text-red-500 ml-1 text-xs">
                                  <AlertTriangle size={12} className="inline mb-0.5 mr-0.5" />
                                  Delayed
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {order.pickedUpAt ? formatTime(order.pickedUpAt) : 'Not picked up'} / 
                              {order.deliveredAt ? formatTime(order.deliveredAt) : 'Not delivered'}
                            </TableCell>
                            <TableCell>{order.dispatcher || 'System'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {order.status || 'Created'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border p-10 text-center text-muted-foreground">
                  {orders.length === 0 ? (
                    <p>No orders available. Please upload data first.</p>
                  ) : (
                    <p>No orders found for the selected date or search criteria.</p>
                  )}
                </div>
              )}
              
              {filteredOrders.some(order => order.hasSuspiciousDelay) && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Suspicious Delays Detected</AlertTitle>
                  <AlertDescription>
                    Some orders have unusually long assignment or delivery times. Review flagged orders above.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="drivers" className="space-y-4 mt-4">
              {selectedDate && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {getMockDriverSchedules(new Date(selectedDate)).map(driver => (
                    <Card key={driver.driverId} className="glass-card subtle-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center">
                          <Users className="mr-2" size={18} />
                          {driver.driverName}
                        </CardTitle>
                        <CardDescription>
                          Driver ID: {driver.driverId}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Shift Start:</span>
                            <span className="font-medium">{format(driver.shiftStart, 'h:mm a')}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Shift End:</span>
                            <span className="font-medium">{format(driver.shiftEnd, 'h:mm a')}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Max Hours:</span>
                            <span className="font-medium">{driver.maxDailyHours} hours</span>
                          </div>
                          
                          {driver.breaks && driver.breaks.length > 0 && (
                            <>
                              <Separator className="my-2" />
                              <div className="text-sm font-medium">Scheduled Breaks:</div>
                              {driver.breaks.map((breakTime, index) => (
                                <div key={index} className="text-sm text-muted-foreground">
                                  {format(breakTime.start, 'h:mm a')} - {format(breakTime.end, 'h:mm a')}
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <div className="w-full">
                          <Button variant="outline" size="sm" className="w-full">
                            <Timer className="mr-1" size={14} />
                            View Assigned Orders
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="optimization" className="space-y-4 mt-4">
              {optimizationResult ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="glass-card subtle-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Distance Savings</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {optimizationResult.distanceSaved.toFixed(1)} mi
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {optimizationResult.percentageSaved.toFixed(1)}% improvement
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="glass-card subtle-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Time Savings</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {Math.floor(optimizationResult.timeSaved / 60)}h {optimizationResult.timeSaved % 60}m
                        </div>
                        <p className="text-muted-foreground text-sm">
                          Estimated driver time saved
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="glass-card subtle-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Reassignments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {optimizationResult.reassignments.length}
                        </div>
                        <p className="text-muted-foreground text-sm">
                          Proposed driver changes
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="glass-card subtle-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Overall Efficiency</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {(100 - optimizationResult.percentageSaved).toFixed(1)}%
                        </div>
                        <p className="text-muted-foreground text-sm">
                          Current dispatcher efficiency
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {optimizationResult.reassignments.length > 0 ? (
                    <div className="rounded-md border glass-card subtle-shadow mt-6">
                      <div className="p-4 border-b">
                        <h3 className="font-medium">Proposed Reassignments</h3>
                        <p className="text-sm text-muted-foreground">
                          These changes could improve efficiency for selected date
                        </p>
                      </div>
                      <div className="max-h-[calc(100vh-550px)] overflow-auto">
                        <Table>
                          <TableHeader className="bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
                            <TableRow>
                              <TableHead>Order ID</TableHead>
                              <TableHead>Current Driver</TableHead>
                              <TableHead>Proposed Driver</TableHead>
                              <TableHead className="text-right">Distance Savings</TableHead>
                              <TableHead className="text-right">Time Savings</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {optimizationResult.reassignments.map((item, i) => (
                              <TableRow key={item.orderId} className={i % 2 === 0 ? 'bg-white/50 dark:bg-gray-950/20' : 'bg-gray-50/50 dark:bg-gray-900/10'}>
                                <TableCell className="font-mono text-xs">{item.orderId}</TableCell>
                                <TableCell>{item.originalDriver}</TableCell>
                                <TableCell>{item.proposedDriver}</TableCell>
                                <TableCell className="text-right font-medium">
                                  {item.distanceSaved.toFixed(1)} mi
                                </TableCell>
                                <TableCell className="text-right">
                                  {Math.floor(item.timeSaved / 60) > 0 ? 
                                    `${Math.floor(item.timeSaved / 60)}h ${item.timeSaved % 60}m` : 
                                    `${item.timeSaved}m`}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <Alert className="mt-6">
                      <AlertTitle>No Reassignments Found</AlertTitle>
                      <AlertDescription>
                        Current dispatcher assignments are already optimal for the selected date.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              ) : (
                <div className="rounded-md border p-10 text-center text-muted-foreground">
                  <p>Select a date and click "Re-Optimize Routes" to see potential improvements.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
