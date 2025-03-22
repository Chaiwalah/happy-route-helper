
import { Invoice, InvoiceItem, PDFTemplateSettings } from './invoiceTypes';
import { toast } from '@/components/ui/use-toast';

// Function to generate PDF data
export const generatePdfInvoice = async (
  invoice: Invoice,
  templateSettings: PDFTemplateSettings
): Promise<Blob | null> => {
  try {
    // In a real implementation, this would use a PDF library like jspdf or pdfmake
    // This is a simplified version to demonstrate structure
    
    console.log('Generating PDF with template settings:', templateSettings);
    console.log('Invoice data:', invoice);
    
    // Here we would implement actual PDF generation using a library
    // For demonstration, we'll create a mock PDF blob
    
    // Mock PDF generation - in real implementation, this would be replaced
    // with actual PDF library code
    const mockPdfContent = `
      CONTRACTOR INVOICING SHEET
      ==========================
      Week Ending: ${invoice.weekEnding || invoice.date}
      Business: ${invoice.businessName || 'Not Specified'}
      Driver: ${invoice.items[0]?.driver || 'Multiple Drivers'}
      Total Due: $${invoice.totalCost.toFixed(2)}
      
      DELIVERIES
      ==========================
      ${invoice.items.map((item, index) => `
        #${index + 1}: ${item.orderId}
        Patient: ${item.patientName || 'N/A'}
        Address: ${item.address || item.dropoff}
        City/Zip: ${item.city || 'N/A'} ${item.zipCode || 'N/A'}
        Date: ${item.date || invoice.date}
        Pickup: ${item.pickupTime || 'N/A'}
        Delivery: ${item.deliveryTime || 'N/A'}
        Notes: ${item.notes || 'N/A'}
        Cost: $${item.totalCost.toFixed(2)}
        -----------------------------
      `).join('\n')}
      
      Total Items: ${invoice.items.length}
      Total Distance: ${invoice.totalDistance.toFixed(1)} miles
      TOTAL AMOUNT: $${invoice.totalCost.toFixed(2)}
    `;
    
    // Convert the mock content to a Blob
    const blob = new Blob([mockPdfContent], { type: 'application/pdf' });
    
    return blob;
  } catch (error) {
    console.error('Error generating PDF:', error);
    toast({
      title: "PDF Generation Failed",
      description: "There was an error generating the PDF invoice.",
      variant: "destructive",
    });
    return null;
  }
};

// Function to send PDF to Slack (mock implementation)
export const sendPdfToSlack = async (
  pdfBlob: Blob,
  invoice: Invoice
): Promise<boolean> => {
  try {
    console.log('Sending PDF to Slack:', pdfBlob);
    
    // This would be replaced with actual Slack API integration
    // Mock successful API call
    toast({
      title: "PDF Sent to Slack",
      description: `Invoice for ${invoice.date} has been sent to Slack for review.`,
    });
    
    return true;
  } catch (error) {
    console.error('Error sending PDF to Slack:', error);
    toast({
      title: "Failed to Send to Slack",
      description: "There was an error sending the invoice to Slack.",
      variant: "destructive",
    });
    return false;
  }
};

// Function to populate invoice items with detailed delivery information
export const enhanceInvoiceItemsWithDetails = (
  invoice: Invoice,
  orders: any[]
): Invoice => {
  // Create a copy of the invoice to avoid mutating the original
  const enhancedInvoice = { ...invoice };
  
  // Match each invoice item with its corresponding order data
  enhancedInvoice.items = invoice.items.map(item => {
    const enhancedItem = { ...item };
    
    // For single routes, there's a direct 1:1 mapping
    if (item.routeType === 'single' && item.orderId) {
      const order = orders.find(o => o.id === item.orderId);
      if (order) {
        // Populate additional fields from order data
        enhancedItem.patientName = order.patientName || order.recipient || 'Unknown';
        enhancedItem.address = order.dropoff || '';
        enhancedItem.city = extractCity(order.dropoff);
        enhancedItem.zipCode = extractZipCode(order.dropoff);
        enhancedItem.date = order.date || invoice.date;
        enhancedItem.pickupTime = order.actualPickupTime || order.exReadyTime || '';
        enhancedItem.deliveryTime = order.actualDeliveryTime || order.exDeliveryTime || '';
        enhancedItem.notes = order.notes || '';
      }
    } 
    // For multi-stop routes, we need to handle multiple orders
    else if (item.routeType === 'multi-stop' && item.orderIds) {
      const matchingOrders = orders.filter(o => item.orderIds?.includes(o.id));
      
      if (matchingOrders.length > 0) {
        // For multi-stop routes, we'll use the first order's data for most fields
        // but could combine information if needed
        const firstOrder = matchingOrders[0];
        
        enhancedItem.patientName = 'Multiple Recipients';
        enhancedItem.address = `${matchingOrders.length} stops - ${firstOrder.dropoff}`;
        enhancedItem.city = extractCity(firstOrder.dropoff);
        enhancedItem.zipCode = extractZipCode(firstOrder.dropoff);
        enhancedItem.date = firstOrder.date || invoice.date;
        enhancedItem.pickupTime = firstOrder.actualPickupTime || firstOrder.exReadyTime || '';
        enhancedItem.deliveryTime = firstOrder.actualDeliveryTime || firstOrder.exDeliveryTime || '';
        
        // Combine notes from all orders
        enhancedItem.notes = matchingOrders
          .map(o => o.notes)
          .filter(Boolean)
          .join(' | ');
      }
    }
    
    return enhancedItem;
  });
  
  return enhancedInvoice;
};

// Helper function to extract city from address
function extractCity(address: string = ''): string {
  // Basic implementation - a more robust solution would use address parsing libraries
  const parts = address.split(',');
  if (parts.length >= 2) {
    // Assuming format like "Street, City, State ZIP"
    return parts[1].trim();
  }
  return '';
}

// Helper function to extract ZIP code from address
function extractZipCode(address: string = ''): string {
  // Basic implementation - a more robust solution would use address parsing libraries
  const zipCodeRegex = /\b\d{5}(?:-\d{4})?\b/;
  const match = address.match(zipCodeRegex);
  return match ? match[0] : '';
}
