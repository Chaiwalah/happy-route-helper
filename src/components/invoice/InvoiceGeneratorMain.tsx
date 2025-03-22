
"use client"

import React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeliveryOrder } from '@/utils/csvParser';
import { 
  Invoice, 
  Issue
} from '@/utils/invoiceCalculator';
import PricingInfo from '@/components/invoice/PricingInfo';
import { InvoiceDetails } from '@/components/invoice/InvoiceDetails';
import { DriverSummary } from '@/components/invoice/DriverSummary';
import { IssuesList } from '@/components/invoice/IssuesList';
import { InvoiceGenerationSettings } from '@/utils/invoiceTypes';
import { InvoiceSettings } from '@/components/invoice/InvoiceSettings';
import { InvoiceMetadataDialog } from '@/components/invoice/InvoiceMetadataDialog';
import { DistanceRecalculationDialog } from '@/components/invoice/DistanceRecalculationDialog';
import { ExportDialog } from '@/components/invoice/ExportDialog';
import { InvoiceHeader } from '@/components/invoice/InvoiceHeader';
import { InvoiceActions } from '@/components/invoice/InvoiceActions';
import { useInvoiceGenerator } from '@/hooks/useInvoiceGenerator';
import { Progress } from "@/components/ui/progress";

interface InvoiceGeneratorProps {
  orders: DeliveryOrder[];
}

export function InvoiceGeneratorMain({ orders }: InvoiceGeneratorProps) {
  const {
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
  } = useInvoiceGenerator(orders);

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
      
      {/* Generation Progress */}
      {isGenerating && progress.total > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Calculating distances...</span>
            <span>{progress.current} of {progress.total} ({progress.percent}%)</span>
          </div>
          <Progress value={progress.percent} className="h-2" />
        </div>
      )}
      
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
