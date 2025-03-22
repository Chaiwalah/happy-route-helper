
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
import { InvoiceGenerationSettings } from '@/utils/invoiceTypes';
import { enhanceInvoiceItemsWithDetails } from '@/utils/pdfGenerator';
import { InvoiceSettings } from '@/components/invoice/InvoiceSettings';
import { InvoiceMetadataDialog } from '@/components/invoice/InvoiceMetadataDialog';
import { DistanceRecalculationDialog } from '@/components/invoice/DistanceRecalculationDialog';
import { ExportDialog } from '@/components/invoice/ExportDialog';
import { InvoiceHeader } from '@/components/invoice/InvoiceHeader';
import { InvoiceActions } from '@/components/invoice/InvoiceActions';

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
          <InvoiceSettings 
            settings={settings} 
            onSettingsChange={setSettings} 
          />
        </div>
        
        <div className="flex space-x-2">
          {invoice && (
            <InvoiceActions 
              invoice={invoice}
              onReview={handleReviewInvoice}
              onFinalize={handleFinalizeInvoice}
              onBusinessInfoClick={openInvoiceMetadataDialog}
            />
          )}
          <Button onClick={handleGenerateInvoice} disabled={isGenerating}>
            {isGenerating ? "Calculating Routes..." : "Generate Invoice"}
          </Button>
        </div>
      </div>
      
      {invoice && (
        <>
          <InvoiceHeader invoice={invoice} />
          
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
      
      {/* Dialogs */}
      <DistanceRecalculationDialog 
        open={itemToRecalculate !== null}
        onOpenChange={(open) => !open && setItemToRecalculate(null)}
        itemToRecalculate={itemToRecalculate}
        onItemToRecalculateChange={setItemToRecalculate}
        onConfirm={confirmRecalculation}
      />
      
      <ExportDialog 
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onExport={handleExport}
      />
      
      <InvoiceMetadataDialog 
        open={showMetadataDialog}
        onOpenChange={setShowMetadataDialog}
        metadata={invoiceMetadata}
        onMetadataChange={setInvoiceMetadata}
        onSave={updateInvoiceMetadata}
      />
    </div>
  );
}
