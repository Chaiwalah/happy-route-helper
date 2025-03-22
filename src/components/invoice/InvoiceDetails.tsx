"use client"

import React, { useRef, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Invoice } from '@/utils/invoiceCalculator';
import { toast } from '@/components/ui/use-toast';
import { 
  CalculatorIcon, 
  Clock, 
  FileDown, 
  Printer, 
  RefreshCw, 
  FileText, 
  Send
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { PDFTemplateSettings } from '@/utils/invoiceTypes';
import { generatePdfInvoice, sendPdfToSlack } from '@/utils/pdfGenerator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface InvoiceDetailsProps {
  invoice: Invoice;
  onRecalculateDistance?: (index: number, currentDistance: number) => void;
  allowRecalculation?: boolean;
  deliveryOrders?: any[]; // Original orders data for PDF enhancement
}

export const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({ 
  invoice,
  onRecalculateDistance,
  allowRecalculation = false,
  deliveryOrders = []
}) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'excel'>('pdf');
  const [pdfSettings, setPdfSettings] = useState<PDFTemplateSettings>({
    template: 'contractor',
    showItemDetails: true,
    includeDateRange: true,
    showBusinessLogo: false,
    showNotes: true,
    companyName: 'Medical Delivery Services',
    companyAddress: '123 Main St, Anytown, USA',
    companyContact: 'support@example.com',
    showDriverDetails: true,
    showPatientDetails: true,
    color: '#4F46E5'
  });
  const [weekEnding, setWeekEnding] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [sendToSlack, setSendToSlack] = useState(false);
  const [slackEmail, setSlackEmail] = useState('');

  const handleExportInvoice = () => {
    setShowExportDialog(true);
  };

  const handlePrintInvoice = () => {
    if (!invoiceRef.current) {
      toast({
        title: "Nothing to print",
        description: "Please generate an invoice first",
        variant: "destructive",
      });
      return;
    }
    
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
      
      toast({
        title: "Print dialog opened",
        description: "Your invoice is ready to print",
      });
    } catch (error) {
      console.error('Error printing invoice:', error);
      toast({
        title: "Print failed",
        description: "Failed to open print dialog",
        variant: "destructive",
      });
    }
  };

  const handleGenerateExport = async () => {
    try {
      // Close dialog first to show progress
      setShowExportDialog(false);
      
      // Prepare invoice with additional metadata
      const enhancedInvoice: Invoice = {
        ...invoice,
        weekEnding: weekEnding || invoice.date,
        businessName: businessName || 'Medical Services',
      };
      
      if (exportFormat === 'pdf') {
        // Show generating toast
        toast({
          title: "Generating PDF",
          description: "Please wait while we prepare your PDF invoice...",
        });
        
        // Generate PDF
        const pdfBlob = await generatePdfInvoice(enhancedInvoice, pdfSettings);
        
        if (!pdfBlob) {
          toast({
            title: "PDF Generation Failed",
            description: "There was an error creating the PDF file.",
            variant: "destructive",
          });
          return;
        }
        
        // Create download link for PDF
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        
        link.setAttribute('href', url);
        link.setAttribute('download', `invoice-${invoice.date}-${pdfSettings.template}.pdf`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Send to Slack if requested
        if (sendToSlack) {
          await sendPdfToSlack(pdfBlob, enhancedInvoice);
        }
        
        toast({
          title: "PDF Export Complete",
          description: "PDF file downloaded successfully",
        });
      } else if (exportFormat === 'csv') {
        // Prepare CSV content
        const headers = ['Order ID', 'Driver', 'Pickup', 'Dropoff', 'Distance (mi)', 'Route Type', 'Stops', 'Base Cost ($)', 'Add-ons ($)', 'Total ($)'];
        
        const rows = invoice.items.map(item => [
          item.orderId,
          item.driver,
          item.pickup,
          item.dropoff,
          item.distance.toFixed(1),
          item.routeType,
          item.stops,
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
      } else if (exportFormat === 'excel') {
        // Mock Excel export functionality
        toast({
          title: "Exporting to Excel",
          description: "Excel export functionality is in development.",
        });
      }
    } catch (error) {
      console.error('Error exporting invoice:', error);
      toast({
        title: "Export failed",
        description: "Failed to export invoice. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Invoice - {invoice.date}</span>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleExportInvoice}>
              <FileDown className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrintInvoice}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          {invoice.items.length} routes, {invoice.totalDistance.toFixed(1)} miles total
        </CardDescription>
      </CardHeader>
      <CardContent ref={invoiceRef}>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50/80 dark:bg-gray-900/50">
              <TableRow>
                <TableHead className="w-[100px]">Order ID(s)</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Route</TableHead>
                <TableHead className="text-right">Distance</TableHead>
                <TableHead className="text-right">Route Type</TableHead>
                <TableHead className="text-right">Stops</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="text-right">Add-ons</TableHead>
                <TableHead className="text-right">Total</TableHead>
                {allowRecalculation && (
                  <TableHead className="w-[40px]"></TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item, index) => (
                <TableRow key={item.orderId} className="animate-slide-in">
                  <TableCell className="font-mono text-xs">
                    {item.orderId.includes(', ') 
                      ? <span title={item.orderId}>{item.orderId.split(', ').length} orders</span>
                      : item.orderId
                    }
                  </TableCell>
                  <TableCell>{item.driver}</TableCell>
                  <TableCell className="max-w-[300px]">
                    <div className="truncate">{item.pickup}</div>
                    <div className="truncate text-muted-foreground text-xs mt-1">to: {item.dropoff}</div>
                    {item.timeWindow && (
                      <div className="text-xs flex items-center mt-1 text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {item.timeWindow}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right relative">
                    {item.distance.toFixed(1)} mi
                    {item.recalculated && item.originalDistance && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-amber-500 absolute top-0 right-0 transform -translate-y-1/2">*</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Manually adjusted from {item.originalDistance.toFixed(1)} mi</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>
                  <TableCell className="text-right capitalize">{item.routeType}</TableCell>
                  <TableCell className="text-right">{item.stops}</TableCell>
                  <TableCell className="text-right">${item.baseCost.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${item.addOns.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">${item.totalCost.toFixed(2)}</TableCell>
                  {allowRecalculation && (
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6" 
                        onClick={() => onRecalculateDistance?.(index, item.distance)}
                        title="Recalculate distance"
                      >
                        <CalculatorIcon className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  )}
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
                {invoice.recalculatedCount && (
                  <TableRow>
                    <TableCell className="text-xs text-muted-foreground italic" colSpan={2}>
                      * {invoice.recalculatedCount} route{invoice.recalculatedCount > 1 ? 's' : ''} manually adjusted
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Invoice</DialogTitle>
            <DialogDescription>
              Choose export format and options for your invoice.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="pdf" onValueChange={(value) => setExportFormat(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pdf">PDF</TabsTrigger>
              <TabsTrigger value="csv">CSV</TabsTrigger>
              <TabsTrigger value="excel">Excel</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pdf" className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-4">
                    <Label htmlFor="template">Invoice Template</Label>
                    <div className="flex mt-2 space-x-2">
                      <Button 
                        variant={pdfSettings.template === 'standard' ? 'default' : 'outline'} 
                        className="flex-1"
                        onClick={() => setPdfSettings({...pdfSettings, template: 'standard'})}
                      >
                        Standard
                      </Button>
                      <Button 
                        variant={pdfSettings.template === 'contractor' ? 'default' : 'outline'} 
                        className="flex-1"
                        onClick={() => setPdfSettings({...pdfSettings, template: 'contractor'})}
                      >
                        Contractor
                      </Button>
                    </div>
                  </div>
                  
                  <div className="col-span-4">
                    <Label htmlFor="weekEnding">Week Ending</Label>
                    <Input 
                      id="weekEnding" 
                      type="date" 
                      value={weekEnding} 
                      onChange={(e) => setWeekEnding(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="col-span-4">
                    <Label htmlFor="businessName">Pharmacy/Lab/Hospital Name</Label>
                    <Input 
                      id="businessName" 
                      value={businessName} 
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g., ABC Pharmacy"
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="col-span-4 pt-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showPatientDetails" className="cursor-pointer">Show Patient Details</Label>
                      <Switch 
                        id="showPatientDetails"
                        checked={pdfSettings.showPatientDetails} 
                        onCheckedChange={(checked) => setPdfSettings({...pdfSettings, showPatientDetails: checked})}
                      />
                    </div>
                  </div>
                  
                  <div className="col-span-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showNotes" className="cursor-pointer">Include Notes</Label>
                      <Switch 
                        id="showNotes"
                        checked={pdfSettings.showNotes} 
                        onCheckedChange={(checked) => setPdfSettings({...pdfSettings, showNotes: checked})}
                      />
                    </div>
                  </div>
                  
                  <div className="col-span-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sendToSlack" className="cursor-pointer">Send to Slack</Label>
                      <Switch 
                        id="sendToSlack"
                        checked={sendToSlack} 
                        onCheckedChange={setSendToSlack}
                      />
                    </div>
                  </div>
                  
                  {sendToSlack && (
                    <div className="col-span-4">
                      <Label htmlFor="slackEmail">Slack Channel or Email</Label>
                      <Input 
                        id="slackEmail" 
                        value={slackEmail} 
                        onChange={(e) => setSlackEmail(e.target.value)}
                        placeholder="e.g., #invoices or user@example.com"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="csv" className="py-4">
              <p className="text-sm text-muted-foreground">
                Export as CSV for use in spreadsheet applications. Includes all invoice data in a tabular format.
              </p>
            </TabsContent>
            
            <TabsContent value="excel" className="py-4">
              <p className="text-sm text-muted-foreground">
                Export as Excel workbook with formatted tables and calculations.
              </p>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="flex space-x-2 sm:justify-start">
            <Button type="button" variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleGenerateExport} className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              {exportFormat === 'pdf' ? 'Generate PDF' : 
               exportFormat === 'csv' ? 'Export CSV' : 'Export Excel'}
            </Button>
            {exportFormat === 'pdf' && sendToSlack && (
              <Button type="button" variant="outline" onClick={handleGenerateExport} className="flex items-center">
                <Send className="h-4 w-4 mr-2" />
                Send to Slack
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
