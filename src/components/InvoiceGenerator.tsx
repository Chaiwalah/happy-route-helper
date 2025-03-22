
"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeliveryOrder } from '@/utils/csvParser';
import { generateInvoice, Invoice, detectIssues, Issue } from '@/utils/invoiceCalculator';
import { toast } from '@/components/ui/use-toast';
import PricingInfo from '@/components/invoice/PricingInfo';
import { InvoiceDetails } from '@/components/invoice/InvoiceDetails';
import { DriverSummary } from '@/components/invoice/DriverSummary';
import { IssuesList } from '@/components/invoice/IssuesList';

interface InvoiceGeneratorProps {
  orders: DeliveryOrder[];
}

export function InvoiceGenerator({ orders }: InvoiceGeneratorProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

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
      description: "Calculating routes using Mapbox Directions API...",
    });
    
    try {
      // Generate invoice using the new billing logic with Mapbox integration
      const generatedInvoice = await generateInvoice(orders);
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <PricingInfo />
        <Button onClick={handleGenerateInvoice} disabled={isGenerating}>
          {isGenerating ? "Calculating Routes..." : "Generate Invoice"}
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
            <InvoiceDetails invoice={invoice} />
          </TabsContent>
          
          <TabsContent value="driver-summary">
            <DriverSummary invoice={invoice} />
          </TabsContent>
          
          <TabsContent value="issues">
            <IssuesList issues={issues} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
