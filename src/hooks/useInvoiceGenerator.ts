import { useState, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
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
import { InvoiceGenerationSettings } from '@/utils/invoiceTypes';
import { enhanceInvoiceItemsWithDetails } from '@/utils/pdfGenerator';

export function useInvoiceGenerator(orders: DeliveryOrder[]) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0 });
  const [settings, setSettings] = useState<InvoiceGenerationSettings>({
    allowManualDistanceAdjustment: true,
    flagDriverLoadThreshold: 10,
    flagDistanceThreshold: 0, // Set to 0 to effectively disable distance-based flagging
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

  // Setup progress updates
  const updateProgress = useCallback((current: number, total: number) => {
    const percent = Math.round((current / total) * 100);
    setProgress({ current, total, percent });
  }, []);

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
    setProgress({ current: 0, total: orders.length, percent: 0 });
    
    // Show a toast to indicate that generation has started
    toast({
      title: "Generating invoice",
      description: `Calculating routes for ${orders.length} orders. This may take a moment...`,
    });
    
    const startTime = performance.now();
    console.log(`Starting invoice generation for ${orders.length} orders`);
    
    // Set up a timeout to check for long-running operations
    const timeout = setTimeout(() => {
      if (isGenerating) {
        toast({
          title: "Still working...",
          description: "Distance calculations are taking longer than expected. Please wait...",
        });
      }
    }, 10000); // 10 seconds
    
    try {
      // Generate invoice with proper route batching by Trip Number
      const generatedInvoice = await generateInvoice(orders, settings, updateProgress);
      
      const endTime = performance.now();
      console.log(`Invoice generation completed in ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
      
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
      clearTimeout(timeout);
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, percent: 0 });
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

  return {
    invoice,
    issues,
    isGenerating,
    settings,
    progress,
    showExportDialog,
    showMetadataDialog,
    itemToRecalculate,
    invoiceMetadata,
    setSettings,
    setShowExportDialog,
    setShowMetadataDialog,
    setItemToRecalculate,
    setInvoiceMetadata,
    handleGenerateInvoice,
    handleRecalculateDistance,
    confirmRecalculation,
    handleReviewInvoice,
    handleFinalizeInvoice,
    handleExport,
    openInvoiceMetadataDialog,
    updateInvoiceMetadata
  };
}
