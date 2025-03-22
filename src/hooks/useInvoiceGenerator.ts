
import { useState, useCallback } from 'react';
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
import { calculateDistances } from '@/utils/distanceCalculator';
import { InvoiceGenerationSettings, InvoiceMetadata } from '@/utils/invoiceTypes';

export function useInvoiceGenerator(orders: DeliveryOrder[]) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [settings, setSettings] = useState<InvoiceGenerationSettings>({
    includeWeekendFee: true,
    includeRushFee: true,
    allowManualDistanceAdjustment: true,
  });
  
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    percent: 0
  });
  
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [itemToRecalculate, setItemToRecalculate] = useState<{ index: number; distance: number } | null>(null);
  const [invoiceMetadata, setInvoiceMetadata] = useState<InvoiceMetadata>({
    businessName: 'Your Business Name',
    businessAddress: '123 Main St, City, State, ZIP',
    businessPhone: '(555) 555-5555',
    businessEmail: 'contact@yourbusiness.com',
    clientName: 'Client Company',
    clientAddress: '456 Client Ave, City, State, ZIP',
    invoiceNumber: `INV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
    paymentTerms: 'Net 30',
    notes: 'Thank you for your business!',
  });

  const handleGenerateInvoice = useCallback(async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    setProgress({ current: 0, total: orders.length, percent: 0 });
    
    try {
      // First calculate distances for all orders
      const updatedOrders = [...orders];
      
      toast({
        title: "Calculating distances",
        description: "This may take a moment for larger datasets"
      });
      
      // Track progress during calculation
      const ordersWithDistances = await calculateDistances(updatedOrders);
      
      // Create a progress tracker
      let completedCount = 0;
      const updateProgress = () => {
        completedCount++;
        const percent = Math.round((completedCount / orders.length) * 100);
        setProgress({
          current: completedCount,
          total: orders.length,
          percent
        });
      };
      
      // Process each order sequentially but with a small delay
      // to allow UI updates
      for (let i = 0; i < ordersWithDistances.length; i++) {
        const order = ordersWithDistances[i];
        updateProgress();
        
        // Allow UI to update by yielding execution
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      const generatedInvoice = generateInvoice(ordersWithDistances, settings);
      setInvoice(generatedInvoice);
      
      // Check for issues
      const detectedIssues = detectIssues(ordersWithDistances);
      setIssues(detectedIssues);
      
      toast({
        title: "Invoice generated",
        description: `${generatedInvoice.items.length} routes calculated with a total of $${generatedInvoice.totalAmount.toFixed(2)}`
      });
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to generate invoice. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }, [orders, settings, isGenerating]);

  const handleRecalculateDistance = useCallback((index: number, currentDistance: number) => {
    setItemToRecalculate({ index, distance: currentDistance });
  }, []);

  const confirmRecalculation = useCallback(() => {
    if (!itemToRecalculate || !invoice) return;
    
    const { index, distance } = itemToRecalculate;
    const updatedItem = recalculateInvoiceItem(invoice.items[index], distance);
    
    // Calculate the difference in total
    const oldAmount = invoice.items[index].amount;
    const newAmount = updatedItem.amount;
    const amountDifference = newAmount - oldAmount;
    
    // Create a new array with the updated item
    const updatedItems = [...invoice.items];
    updatedItems[index] = updatedItem;
    
    // Update the invoice
    const updatedInvoice = {
      ...invoice,
      items: updatedItems,
      totalAmount: invoice.totalAmount + amountDifference
    };
    
    setInvoice(updatedInvoice);
    setItemToRecalculate(null);
    
    toast({
      title: "Distance updated",
      description: `Route distance updated to ${distance.toFixed(1)} miles. Amount changed by $${Math.abs(amountDifference).toFixed(2)}.`
    });
  }, [invoice, itemToRecalculate]);

  const handleReviewInvoice = useCallback(() => {
    if (!invoice) return;
    
    const reviewedInvoice = reviewInvoice(invoice);
    setInvoice(reviewedInvoice);
    
    toast({
      title: "Invoice reviewed",
      description: "The invoice has been marked as reviewed."
    });
  }, [invoice]);

  const handleFinalizeInvoice = useCallback(() => {
    if (!invoice) return;
    
    const finalizedInvoice = finalizeInvoice(invoice);
    setInvoice(finalizedInvoice);
    
    toast({
      title: "Invoice finalized",
      description: "The invoice has been finalized and is ready for export."
    });
    
    // Show export dialog
    setShowExportDialog(true);
  }, [invoice]);

  const handleExport = useCallback((format: 'pdf' | 'csv' | 'excel') => {
    if (!invoice) return;
    
    toast({
      title: "Export started",
      description: `Exporting invoice as ${format.toUpperCase()}...`
    });
    
    // Simulating export process
    setTimeout(() => {
      toast({
        title: "Export complete",
        description: `Invoice has been exported as ${format.toUpperCase()}.`
      });
      setShowExportDialog(false);
    }, 1500);
  }, [invoice]);

  const openInvoiceMetadataDialog = useCallback(() => {
    setShowMetadataDialog(true);
  }, []);

  const updateInvoiceMetadata = useCallback((metadata: InvoiceMetadata) => {
    setInvoiceMetadata(metadata);
    setShowMetadataDialog(false);
    
    toast({
      title: "Invoice details updated",
      description: "Business and client information has been updated."
    });
  }, []);

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
