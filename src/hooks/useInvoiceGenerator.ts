import { useState, useCallback } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { 
  generateInvoice as calculateInvoice, 
  Invoice, 
  InvoiceItem 
} from '@/utils/invoiceCalculator';
import { 
  InvoiceGenerationSettings,
  InvoiceMetadata 
} from '@/utils/invoiceTypes';
import { toast } from '@/components/ui/use-toast';

export const useInvoiceGenerator = (orders: DeliveryOrder[]) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [issues, setIssues] = useState<any[]>([]);
  const [settings, setSettings] = useState<InvoiceGenerationSettings>({
    baseRate: 25,
    mileageRate: 1.1,
    additionalStopFee: 12,
    distanceThreshold: 25,
    allowManualDistanceAdjustment: true,
    applyUrbanFee: false,
    urbanFeeAmount: 5,
    applyRushFee: false,
    rushFeePercentage: 15,
    calculateTotalMileage: true,
    flagDriverLoadThreshold: 10,
    flagDistanceThreshold: 100,
    flagTimeWindowThreshold: 30,
  });
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0 });
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [itemToRecalculate, setItemToRecalculate] = useState<{index: number, currentDistance: number} | null>(null);
  const [invoiceMetadata, setInvoiceMetadata] = useState<InvoiceMetadata>({
    businessName: '',
    businessAddress: '',
    businessContact: '',
    invoiceNumber: '',
    dateIssued: new Date().toISOString().split('T')[0],
    dateDue: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ''
  });

  // Function to generate invoice based on orders and settings
  const handleGenerateInvoice = useCallback(async () => {
    if (orders.length === 0) {
      toast({
        title: "No orders",
        description: "Please upload order data first",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgress({ current: 0, total: orders.length, percent: 0 });

    try {
      // Clear any existing invoice
      setInvoice(null);
      
      // Set up progress tracking
      const updateProgress = (current: number) => {
        setProgress(prev => {
          const percent = Math.round((current / prev.total) * 100);
          return { current, total: prev.total, percent };
        });
      };
      
      // Generate invoice with progress updates
      const newInvoice = await calculateInvoice(orders, settings, updateProgress);
      setInvoice(newInvoice);
      
      // Reset progress
      setProgress({ current: 0, total: 0, percent: 0 });
      
      toast({
        title: "Invoice generated",
        description: `Generated invoice with ${newInvoice.items.length} items totaling $${newInvoice.totalCost.toFixed(2)}`,
      });
    } catch (error) {
      console.error('Error calculating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to generate invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [orders, settings]);

  // Function to recalculate distance for a specific item
  const handleRecalculateDistance = useCallback((index: number, currentDistance: number) => {
    if (!invoice) return;
    
    setItemToRecalculate({ index, currentDistance });
  }, [invoice]);

  // Function to confirm distance recalculation
  const confirmRecalculation = useCallback((index: number, newDistance: number) => {
    if (!invoice) return;
    
    // Create a copy of the invoice
    const updatedInvoice = { ...invoice };
    const item = { ...updatedInvoice.items[index] };
    
    // Store original distance if this is the first time recalculating
    if (!item.originalDistance) {
      item.originalDistance = item.distance;
    }
    
    // Update distance and recalculated flag
    item.distance = newDistance;
    item.recalculated = true;
    
    // Recalculate costs for this item
    if (item.distance <= settings.distanceThreshold) {
      item.baseCost = settings.baseRate;
    } else {
      item.baseCost = item.distance * settings.mileageRate;
    }
    
    // Recalculate total cost
    item.totalCost = item.baseCost + item.addOns;
    
    // Update item in invoice
    updatedInvoice.items[index] = item;
    
    // Update total distance and cost
    updatedInvoice.totalDistance = updatedInvoice.items.reduce((acc, item) => acc + item.distance, 0);
    updatedInvoice.totalCost = updatedInvoice.items.reduce((acc, item) => acc + item.totalCost, 0);
    
    // Count recalculated items
    updatedInvoice.recalculatedCount = updatedInvoice.items.filter(item => item.recalculated).length;
    
    // Update last modified timestamp
    updatedInvoice.lastModified = new Date().toISOString();
    
    // Update invoice state
    setInvoice(updatedInvoice);
    setItemToRecalculate(null);
    
    toast({
      title: "Distance updated",
      description: `Updated distance for route ${index + 1} to ${newDistance.toFixed(1)} miles`,
    });
  }, [invoice, settings]);

  // Function to review invoice
  const handleReviewInvoice = useCallback(() => {
    if (!invoice) return;
    
    const updatedInvoice = { ...invoice, status: 'reviewed', lastModified: new Date().toISOString() };
    setInvoice(updatedInvoice);
    
    toast({
      title: "Invoice reviewed",
      description: "Invoice has been marked as reviewed",
    });
  }, [invoice]);

  // Function to finalize invoice
  const handleFinalizeInvoice = useCallback(() => {
    if (!invoice) return;
    
    const updatedInvoice = { ...invoice, status: 'finalized', lastModified: new Date().toISOString() };
    setInvoice(updatedInvoice);
    
    toast({
      title: "Invoice finalized",
      description: "Invoice has been finalized and can no longer be edited",
    });
  }, [invoice]);

  // Function to export invoice
  const handleExport = useCallback(() => {
    if (!invoice) return;
    
    // Export functionality would be implemented here
    toast({
      title: "Export complete",
      description: "Invoice exported successfully",
    });
    
    setShowExportDialog(false);
  }, [invoice]);

  // Function to open invoice metadata dialog
  const openInvoiceMetadataDialog = useCallback(() => {
    setShowMetadataDialog(true);
  }, []);

  // Function to update invoice metadata
  const updateInvoiceMetadata = useCallback((metadata: InvoiceMetadata) => {
    if (!invoice) return;
    
    const updatedInvoice = { 
      ...invoice, 
      businessName: metadata.businessName,
      businessAddress: metadata.businessAddress,
      businessContact: metadata.businessContact,
      lastModified: new Date().toISOString()
    };
    
    setInvoice(updatedInvoice);
    setInvoiceMetadata(metadata);
    setShowMetadataDialog(false);
    
    toast({
      title: "Business info updated",
      description: "Invoice business information has been updated",
    });
  }, [invoice]);

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
};
