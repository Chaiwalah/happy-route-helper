
import { useState, useRef } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DeliveryOrder } from '@/utils/csvParser';
import { generateInvoice, Invoice, InvoiceItem, detectIssues, Issue } from '@/utils/invoiceCalculator';
import { toast } from '@/components/ui/use-toast';

interface InvoiceGeneratorProps {
  orders: DeliveryOrder[];
}

export function InvoiceGenerator({ orders }: InvoiceGeneratorProps) {
  const [ratePerMile, setRatePerMile] = useState(1.5);
  const [baseRate, setBaseRate] = useState(10);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handleGenerateInvoice = () => {
    if (orders.length === 0) {
      toast({
        title: "No orders available",
        description: "Please upload and process orders first",
        variant: "destructive",
      });
      return;
    }
    
    // Generate invoice with current rates
    const generatedInvoice = generateInvoice(orders, ratePerMile, baseRate);
    setInvoice(generatedInvoice);
    
    // Detect any potential issues
    const detectedIssues = detectIssues(orders);
    setIssues(detectedIssues);
    
    if (detectedIssues.length > 0) {
      toast({
        title: `${detectedIssues.length} issue${detectedIssues.length > 1 ? 's' : ''} detected`,
        description: "Check the Issues tab for details",
        variant: "warning",
      });
    } else {
      toast({
        title: "Invoice generated successfully",
        description: `Total: $${generatedInvoice.totalCost.toFixed(2)} for ${orders.length} orders`,
      });
    }
  };

  const handleExportInvoice = () => {
    if (!invoice) return;
    
    try {
      // Prepare CSV content
      const headers = ['Order ID', 'Driver', 'Pickup', 'Dropoff', 'Distance (mi)', 'Base Cost ($)', 'Add-ons ($)', 'Total ($)'];
      
      const rows = invoice.items.map(item => [
        item.orderId,
        item.driver,
        item.pickup,
        item.dropoff,
        item.distance.toFixed(1),
        item.baseCost.toFixed(2),
        item.addOns.toFixed(2),
        item.totalCost.toFixed(2)
      ]);
      
      // Add summary row
      rows.push([
        'TOTAL',
        '',
        '',
        '',
        invoice.totalDistance.toFixed(1),
        '',
        '',
        invoice.totalCost.toFixed(2)
      ]);
      
      // Convert to CSV
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `invoice-${invoice.date}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Invoice exported",
        description: "CSV file downloaded successfully",
      });
    } catch (error) {
      console.error('Error exporting invoice:', error);
      toast({
        title: "Export failed",
        description: "Failed to export invoice to CSV",
        variant: "destructive",
      });
    }
  };

  const handlePrintInvoice = () => {
    if (!invoiceRef.current) return;
    
    try {
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        toast({
          title: "Print failed",
          description: "Pop-up blocker may be preventing the print window from opening",
          variant: "destructive",
        });
        return;
      }
      
      // Get styles from current page
      const styles = Array.from(document.styleSheets)
        .map(styleSheet => {
          try {
            return Array.from(styleSheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n');
          } catch (e) {
            return '';
          }
        })
        .join('\n');
      
      // Clone the invoice element
      const invoiceHtml = invoiceRef.current.outerHTML;
      
      // Create print document
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice ${invoice?.date}</title>
            <style>${styles}</style>
            <style>
              body { 
                padding: 20px;
                background-color: white;
                color: black;
              }
              @media print {
                body { 
                  padding: 0;
                }
                button {
                  display: none !important;
                }
              }
            </style>
          </head>
          <body>
            <div>${invoiceHtml}</div>
            <script>
              setTimeout(() => {
                window.print();
                setTimeout(() => window.close(), 500);
              }, 500);
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
    } catch (error) {
      console.error('Error printing invoice:', error);
      toast({
        title: "Print failed",
        description: "Failed to open print dialog",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="base-rate">Base Rate ($)</Label>
          <Input
            id="base-rate"
            type="number"
            min="0"
            step="0.5"
            value={baseRate}
            onChange={(e) => setBaseRate(parseFloat(e.target.value))}
            className="w-32"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rate-per-mile">Rate per Mile ($)</Label>
          <Input
            id="rate-per-mile"
            type="number"
            min="0"
            step="0.1"
            value={ratePerMile}
            onChange={(e) => setRatePerMile(parseFloat(e.target.value))}
            className="w-32"
          />
        </div>
        <Button onClick={handleGenerateInvoice} className="ml-auto">
          Generate Invoice
        </Button>
      </div>
      
      {invoice && (
        <Tabs defaultValue="invoice" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="invoice">Invoice</TabsTrigger>
            <TabsTrigger value="driver-summary">Driver Summary</TabsTrigger>
            <TabsTrigger value="issues" className={issues.length > 0 ? "text-orange-500 font-medium" : ""}>
              Issues {issues.length > 0 && `(${issues.length})`}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="invoice">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Invoice - {invoice.date}</span>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={handleExportInvoice}>
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrintInvoice}>
                      Print
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  {invoice.items.length} orders, {invoice.totalDistance.toFixed(1)} miles total
                </CardDescription>
              </CardHeader>
              <CardContent ref={invoiceRef}>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50/80 dark:bg-gray-900/50">
                      <TableRow>
                        <TableHead className="w-[80px]">Order ID</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead className="text-right">Distance</TableHead>
                        <TableHead className="text-right">Base</TableHead>
                        <TableHead className="text-right">Add-ons</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.items.map((item) => (
                        <TableRow key={item.orderId} className="animate-slide-in">
                          <TableCell className="font-mono text-xs">{item.orderId}</TableCell>
                          <TableCell>{item.driver}</TableCell>
                          <TableCell className="max-w-[300px]">
                            <div className="truncate">{item.pickup}</div>
                            <div className="truncate text-muted-foreground text-xs mt-1">to: {item.dropoff}</div>
                          </TableCell>
                          <TableCell className="text-right">{item.distance.toFixed(1)} mi</TableCell>
                          <TableCell className="text-right">${item.baseCost.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${item.addOns.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">${item.totalCost.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <div className="w-72 rounded-md border overflow-hidden">
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Total Distance</TableCell>
                          <TableCell className="text-right">{invoice.totalDistance.toFixed(1)} mi</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Total Cost</TableCell>
                          <TableCell className="text-right font-bold">${invoice.totalCost.toFixed(2)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="driver-summary">
            <Card>
              <CardHeader>
                <CardTitle>Driver Summary</CardTitle>
                <CardDescription>
                  Performance summary by driver
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50/80 dark:bg-gray-900/50">
                      <TableRow>
                        <TableHead>Driver</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Distance</TableHead>
                        <TableHead className="text-right">Earnings</TableHead>
                        <TableHead className="text-right">Avg. per Order</TableHead>
                        <TableHead className="text-right">Avg. per Mile</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.driverSummaries.map((summary) => (
                        <TableRow key={summary.name} className="animate-slide-in">
                          <TableCell className="font-medium">{summary.name}</TableCell>
                          <TableCell className="text-right">{summary.orderCount}</TableCell>
                          <TableCell className="text-right">{summary.totalDistance.toFixed(1)} mi</TableCell>
                          <TableCell className="text-right font-medium">${summary.totalEarnings.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            ${(summary.totalEarnings / summary.orderCount).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            ${(summary.totalEarnings / summary.totalDistance).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="issues">
            <Card>
              <CardHeader>
                <CardTitle>Potential Issues</CardTitle>
                <CardDescription>
                  {issues.length > 0 
                    ? `${issues.length} potential issue${issues.length > 1 ? 's' : ''} detected` 
                    : "No issues detected"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {issues.length > 0 ? (
                  <div className="space-y-4">
                    {issues.map((issue, index) => (
                      <div 
                        key={`${issue.orderId}-${index}`}
                        className={`p-4 rounded-md border ${
                          issue.severity === 'error' 
                            ? 'bg-red-50/50 border-red-200 dark:bg-red-900/20 dark:border-red-800/40' 
                            : 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/40'
                        } animate-slide-in`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className={`text-sm font-medium ${
                              issue.severity === 'error' ? 'text-red-800 dark:text-red-400' : 'text-amber-800 dark:text-amber-400'
                            }`}>
                              {issue.severity === 'error' ? 'Error' : 'Warning'}: {issue.message}
                            </h4>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                              {issue.details}
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            <div className="font-medium">{issue.orderId}</div>
                            <div className="text-gray-500">{issue.driver}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 mx-auto flex items-center justify-center mb-4">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-8 w-8 text-green-600 dark:text-green-400" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">All clear!</p>
                    <p className="mt-1">No issues detected with the current orders</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
