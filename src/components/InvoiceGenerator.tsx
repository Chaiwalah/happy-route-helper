"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeliveryOrder } from '@/utils/csvParser';
import { 
  generateInvoice, 
  Invoice, 
  detectIssues, 
  Issue,
  recalculateInvoiceItem,
  reviewInvoice,
  finalizeInvoice
} from '@/utils/invoiceCalculator';
import { toast } from '@/components/ui/use-toast';
import PricingInfo from '@/components/invoice/PricingInfo';
import { InvoiceDetails } from '@/components/invoice/InvoiceDetails';
import { DriverSummary } from '@/components/invoice/DriverSummary';
import { IssuesList } from '@/components/invoice/IssuesList';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Settings, Download, CheckCircle2, FileText, Building, CalendarRange } from 'lucide-react';
import { InvoiceGenerationSettings } from '@/utils/invoiceTypes';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { enhanceInvoiceItemsWithDetails } from '@/utils/pdfGenerator';

interface InvoiceGeneratorProps {
  orders: DeliveryOrder[];
}

export function InvoiceGenerator({ orders }: InvoiceGeneratorProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [settings, setSettings] = useState<InvoiceGenerationSettings>({
    allowManualDistanceAdjustment: true,
    flagDriverLoadThreshold: 10,
    flagDistanceThreshold: 150, // Updated from 50 to 150 miles
    flagTimeWindowThreshold: 30
  });
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [itemToRecalculate, setItemToRecalculate] = useState<{index: number, distance: number} | null>(null);
  const [invoiceMetadata, setInvoiceMetadata] = useState({
    weekEnding: '',
    businessName: '',
    businessType: 'pharmacy' as 'pharmacy' | 'lab' | 'hospital' | 'other',
    contactPerson: ''
  });

  const handleGenerateInvoice = async () => {
    if (orders.length === 0) {
      toast({
        title: "No orders available",
        description: "Please upload and process orders first",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    toast({
      title: "Generating invoice",
      description: "Grouping orders by Trip Number and calculating routes...",
    });
    
    try {
      // Generate invoice with proper route batching by Trip Number
      const generatedInvoice = await generateInvoice(orders, settings);
      
      // Enhance invoice with metadata from invoice settings
      const enhancedInvoice = {
        ...generatedInvoice,
        weekEnding: invoiceMetadata.weekEnding || generatedInvoice.date,
        businessName: invoiceMetadata.businessName || 'Medical Services',
        businessType: invoiceMetadata.businessType,
        contactPerson: invoiceMetadata.contactPerson
      };
      
      // Enhance invoice items with detailed delivery information for PDF export
      const invoiceWithDetails = enhanceInvoiceItemsWithDetails(enhancedInvoice, orders);
      setInvoice(invoiceWithDetails);
      
      // Detect any potential issues
      const detectedIssues = detectIssues(orders, settings);
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
          description: `Total: $${invoiceWithDetails.totalCost.toFixed(2)} for ${orders.length} orders (${invoiceWithDetails.items.length} routes)`,
        });
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({
        title: "Error generating invoice",
        description: "There was a problem calculating the routes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleRecalculateDistance = (index: number, currentDistance: number) => {
    setItemToRecalculate({ index, distance: currentDistance });
  };
  
  const confirmRecalculation = () => {
    if (!itemToRecalculate || !invoice) return;
    
    try {
      const updatedInvoice = recalculateInvoiceItem(
        invoice, 
        itemToRecalculate.index, 
        itemToRecalculate.distance
      );
      
      setInvoice(updatedInvoice);
      
      toast({
        title: "Distance recalculated",
        description: `Route updated with new distance of ${itemToRecalculate.distance.toFixed(1)} miles`,
      });
      
      setItemToRecalculate(null);
    } catch (error) {
      console.error('Error recalculating distance:', error);
      toast({
        title: "Recalculation failed",
        description: "There was a problem updating the distance. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleReviewInvoice = () => {
    if (!invoice) return;
    
    const updatedInvoice = reviewInvoice(invoice);
    setInvoice(updatedInvoice);
    
    toast({
      title: "Invoice reviewed",
      description: "Invoice has been marked as reviewed",
    });
  };
  
  const handleFinalizeInvoice = () => {
    if (!invoice) return;
    
    const updatedInvoice = finalizeInvoice(invoice);
    setInvoice(updatedInvoice);
    
    toast({
      title: "Invoice finalized",
      description: "Invoice has been finalized and is ready for export",
    });
    
    // Open export dialog
    setShowExportDialog(true);
  };
  
  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (!invoice) return;
    
    // In a real implementation, these would connect to actual export functions
    toast({
      title: `Exporting as ${format.toUpperCase()}`,
      description: `Invoice is being prepared for ${format.toUpperCase()} export`,
    });
    
    // Close dialog
    setShowExportDialog(false);
  };
  
  const openInvoiceMetadataDialog = () => {
    setShowMetadataDialog(true);
  };
  
  const updateInvoiceMetadata = () => {
    if (!invoice) return;
    
    const updatedInvoice = {
      ...invoice,
      weekEnding: invoiceMetadata.weekEnding || invoice.date,
      businessName: invoiceMetadata.businessName,
      businessType: invoiceMetadata.businessType,
      contactPerson: invoiceMetadata.contactPerson
    };
    
    setInvoice(updatedInvoice);
    setShowMetadataDialog(false);
    
    toast({
      title: "Invoice details updated",
      description: "The invoice metadata has been updated successfully",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <PricingInfo />
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8" title="Invoice Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Invoice Generation Settings</h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="driver-threshold" className="text-xs">Driver load threshold</Label>
                    <span className="text-xs font-mono">{settings.flagDriverLoadThreshold} orders</span>
                  </div>
                  <Slider 
                    id="driver-threshold"
                    min={5}
                    max={20}
                    step={1}
                    value={[settings.flagDriverLoadThreshold]}
                    onValueChange={(value) => setSettings({ ...settings, flagDriverLoadThreshold: value[0] })}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="distance-threshold" className="text-xs">Distance warning threshold</Label>
                    <span className="text-xs font-mono">{settings.flagDistanceThreshold} miles</span>
                  </div>
                  <Slider 
                    id="distance-threshold"
                    min={50}
                    max={200}
                    step={10}
                    value={[settings.flagDistanceThreshold]}
                    onValueChange={(value) => setSettings({ ...settings, flagDistanceThreshold: value[0] })}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="time-threshold" className="text-xs">Time window threshold</Label>
                    <span className="text-xs font-mono">{settings.flagTimeWindowThreshold} min</span>
                  </div>
                  <Slider 
                    id="time-threshold"
                    min={15}
                    max={60}
                    step={5}
                    value={[settings.flagTimeWindowThreshold]}
                    onValueChange={(value) => setSettings({ ...settings, flagTimeWindowThreshold: value[0] })}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex space-x-2">
          {invoice && (
            <>
              <Button 
                variant="outline" 
                onClick={openInvoiceMetadataDialog}
                className="flex items-center"
              >
                <Building className="h-4 w-4 mr-2" />
                Business Info
              </Button>
              <Button 
                variant="outline" 
                disabled={invoice.status === 'finalized'} 
                onClick={handleReviewInvoice}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Review
              </Button>
              <Button 
                variant="outline" 
                disabled={invoice.status === 'finalized'} 
                onClick={handleFinalizeInvoice}
              >
                <FileText className="h-4 w-4 mr-2" />
                Finalize
              </Button>
            </>
          )}
          <Button onClick={handleGenerateInvoice} disabled={isGenerating}>
            {isGenerating ? "Calculating Routes..." : "Generate Invoice"}
          </Button>
        </div>
      </div>
      
      {invoice && (
        <>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium">Invoice {invoice.date}</h3>
              <Badge variant={
                invoice.status === 'finalized' ? 'default' : 
                invoice.status === 'reviewed' ? 'secondary' : 'outline'
              }>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </Badge>
              {invoice.recalculatedCount && (
                <Badge variant="outline" className="text-amber-500 border-amber-500">
                  {invoice.recalculatedCount} manual adjustment{invoice.recalculatedCount > 1 ? 's' : ''}
                </Badge>
              )}
              {invoice.businessName && (
                <Badge variant="outline" className="text-blue-500 border-blue-500">
                  {invoice.businessName}
                </Badge>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground">
              Last modified: {new Date(invoice.lastModified).toLocaleString()}
            </div>
          </div>
          
          <Tabs defaultValue="invoice" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="invoice">Invoice</TabsTrigger>
              <TabsTrigger value="driver-summary">Driver Summary</TabsTrigger>
              <TabsTrigger value="issues" className={issues.length > 0 ? "text-orange-500 font-medium" : ""}>
                Issues {issues.length > 0 && `(${issues.length})`}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="invoice">
              <InvoiceDetails 
                invoice={invoice} 
                onRecalculateDistance={handleRecalculateDistance} 
                allowRecalculation={settings.allowManualDistanceAdjustment && invoice.status !== 'finalized'} 
                deliveryOrders={orders}
              />
            </TabsContent>
            
            <TabsContent value="driver-summary">
              <DriverSummary invoice={invoice} />
            </TabsContent>
            
            <TabsContent value="issues">
              <IssuesList issues={issues} />
            </TabsContent>
          </Tabs>
        </>
      )}
      
      {/* Distance Recalculation Dialog */}
      <Dialog 
        open={itemToRecalculate !== null} 
        onOpenChange={(open) => !open && setItemToRecalculate(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Route Distance</DialogTitle>
          </DialogHeader>
          
          {itemToRecalculate && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Manually adjust the distance for this route. This will recalculate the cost.
              </p>
              
              <div className="flex items-center space-x-4">
                <Label htmlFor="distance" className="w-24">Distance (mi)</Label>
                <Input 
                  id="distance" 
                  type="number" 
                  min="0.1" 
                  step="0.1" 
                  value={itemToRecalculate.distance} 
                  onChange={(e) => setItemToRecalculate({
                    ...itemToRecalculate,
                    distance: parseFloat(e.target.value) || 0
                  })}
                  className="flex-1"
                />
              </div>
              
              <p className="text-xs text-muted-foreground italic">
                Original API-calculated distances are based on actual driving routes. Manual adjustments will be flagged in the invoice.
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemToRecalculate(null)}>
              Cancel
            </Button>
            <Button onClick={confirmRecalculation}>
              Update Distance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Invoice</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Choose export format for the finalized invoice.
            </p>
            
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => handleExport('csv')} variant="outline" className="flex flex-col h-auto py-4">
                <FileText className="h-6 w-6 mb-1" />
                <span>CSV</span>
              </Button>
              <Button onClick={() => handleExport('excel')} variant="outline" className="flex flex-col h-auto py-4">
                <svg className="h-6 w-6 mb-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 13H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 17H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="10 9 9 9 8 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Excel</span>
              </Button>
              <Button onClick={() => handleExport('pdf')} variant="outline" className="flex flex-col h-auto py-4">
                <Download className="h-6 w-6 mb-1" />
                <span>PDF</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Invoice Metadata Dialog */}
      <Dialog open={showMetadataDialog} onOpenChange={setShowMetadataDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invoice Business Details</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="weekEnding">Week Ending</Label>
              <Input 
                id="weekEnding" 
                type="date" 
                value={invoiceMetadata.weekEnding} 
                onChange={(e) => setInvoiceMetadata({...invoiceMetadata, weekEnding: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input 
                id="businessName" 
                value={invoiceMetadata.businessName} 
                onChange={(e) => setInvoiceMetadata({...invoiceMetadata, businessName: e.target.value})}
                placeholder="e.g., ABC Pharmacy"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <div className="flex space-x-2 mt-1">
                <Button
                  type="button"
                  variant={invoiceMetadata.businessType === 'pharmacy' ? 'default' : 'outline'}
                  onClick={() => setInvoiceMetadata({...invoiceMetadata, businessType: 'pharmacy'})}
                  className="flex-1"
                >
                  Pharmacy
                </Button>
                <Button
                  type="button"
                  variant={invoiceMetadata.businessType === 'lab' ? 'default' : 'outline'}
                  onClick={() => setInvoiceMetadata({...invoiceMetadata, businessType: 'lab'})}
                  className="flex-1"
                >
                  Lab
                </Button>
                <Button
                  type="button"
                  variant={invoiceMetadata.businessType === 'hospital' ? 'default' : 'outline'}
                  onClick={() => setInvoiceMetadata({...invoiceMetadata, businessType: 'hospital'})}
                  className="flex-1"
                >
                  Hospital
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input 
                id="contactPerson" 
                value={invoiceMetadata.contactPerson} 
                onChange={(e) => setInvoiceMetadata({...invoiceMetadata, contactPerson: e.target.value})}
                placeholder="e.g., John Smith"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMetadataDialog(false)}>
              Cancel
            </Button>
            <Button onClick={updateInvoiceMetadata}>
              Update Invoice Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
