
import { useState } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { Issue, detectIssues } from '@/utils/invoiceCalculator';
import { FileUpload } from '@/components/FileUpload';
import { DataTable } from '@/components/DataTable';
import { InvoiceGenerator } from '@/components/InvoiceGenerator';
import { IssueFlagging } from '@/components/IssueFlagging';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

const Index = () => {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');

  const handleDataParsed = (parsedOrders: DeliveryOrder[]) => {
    setOrders(parsedOrders);
    
    // Move to orders tab after successful upload
    if (parsedOrders.length > 0) {
      setActiveTab('orders');
    }
    
    // Check for potential issues
    const detectedIssues = detectIssues(parsedOrders);
    setIssues(detectedIssues);
  };

  const handleOrdersUpdated = (updatedOrders: DeliveryOrder[]) => {
    setOrders(updatedOrders);
    
    // Re-check for issues after orders are updated
    const detectedIssues = detectIssues(updatedOrders);
    setIssues(detectedIssues);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="mr-4 hidden md:flex">
            <h1 className="text-xl font-medium tracking-tight">Dispatch & Invoicing Assistant</h1>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <div className="text-sm text-muted-foreground">
              {orders.length > 0 && (
                <span>{orders.length} order{orders.length !== 1 && 's'} loaded</span>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <main className="container py-6 md:py-10 flex-1">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <div className="backdrop-blur-sm sticky top-0 z-10 pb-4 pt-1 bg-background/95 supports-[backdrop-filter]:bg-background/60">
            <TabsList className="grid w-full grid-cols-4 h-12">
              <TabsTrigger value="upload">1. Upload CSV</TabsTrigger>
              <TabsTrigger 
                value="orders" 
                disabled={orders.length === 0}
              >
                2. Review Orders
              </TabsTrigger>
              <TabsTrigger 
                value="invoice" 
                disabled={orders.length === 0}
              >
                3. Generate Invoice
              </TabsTrigger>
              <TabsTrigger 
                value="issues" 
                disabled={orders.length === 0}
                className={issues.length > 0 ? "text-orange-500 font-medium" : ""}
              >
                Issues {issues.length > 0 && `(${issues.length})`}
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="upload" className="space-y-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">Upload Delivery Data</h2>
              <p className="text-muted-foreground">
                Start by uploading your CSV file containing delivery order information
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <FileUpload 
                onDataParsed={handleDataParsed} 
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            </div>
            
            <div className="rounded-lg border bg-card p-6 glass-card subtle-shadow">
              <h3 className="font-medium text-lg mb-3">Expected CSV Format</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Your CSV file should include the following columns (column names can vary):
              </p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Column</th>
                      <th className="text-left py-2 px-3 font-medium">Description</th>
                      <th className="text-left py-2 px-3 font-medium">Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 px-3 font-mono">driver</td>
                      <td className="py-2 px-3">Driver name or ID</td>
                      <td className="py-2 px-3 font-mono">John Smith</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3 font-mono">pickup</td>
                      <td className="py-2 px-3">Pickup address</td>
                      <td className="py-2 px-3 font-mono">123 Main St, City</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3 font-mono">dropoff</td>
                      <td className="py-2 px-3">Delivery address</td>
                      <td className="py-2 px-3 font-mono">456 Oak Ave, City</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3 font-mono">timeWindowStart</td>
                      <td className="py-2 px-3">Delivery start time</td>
                      <td className="py-2 px-3 font-mono">9:00 AM</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3 font-mono">timeWindowEnd</td>
                      <td className="py-2 px-3">Delivery end time</td>
                      <td className="py-2 px-3 font-mono">11:00 AM</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3 font-mono">items</td>
                      <td className="py-2 px-3">Items being delivered</td>
                      <td className="py-2 px-3 font-mono">Medication, Package</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono">notes</td>
                      <td className="py-2 px-3">Special instructions</td>
                      <td className="py-2 px-3 font-mono">Call upon arrival</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="orders" className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">Review Orders</h2>
              <p className="text-muted-foreground">
                Review and edit order details before generating invoices
              </p>
            </div>
            
            <ScrollArea className="h-[calc(100vh-220px)]">
              <DataTable data={orders} onOrdersUpdated={handleOrdersUpdated} />
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="invoice" className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">Invoice Generation</h2>
              <p className="text-muted-foreground">
                Generate invoice based on delivery orders and rates
              </p>
            </div>
            
            <ScrollArea className="h-[calc(100vh-220px)]">
              <InvoiceGenerator orders={orders} />
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="issues" className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">Issues & Recommendations</h2>
              <p className="text-muted-foreground">
                Review potential issues with orders and assignments
              </p>
            </div>
            
            <ScrollArea className="h-[calc(100vh-220px)]">
              <IssueFlagging issues={issues} />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </main>
      
      <footer className="border-t py-6 md:py-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-sm text-muted-foreground md:text-left text-center">
            Dispatch & Invoicing Assistant — Simplify your delivery management workflow
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
