
"use client"

import React, { useState, useEffect } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { Issue } from '@/utils/invoiceTypes';
import { detectIssues } from '@/utils/issueDetector';
import { removeOrdersWithMissingTripNumbers } from '@/utils/routeOrganizer';
import { DataVerification } from '@/components/DataVerification';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent } from '@/components/ui/tabs';

// Layout components
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';

// Tab components
import { UploadTab } from '@/components/tabs/UploadTab';
import { OrdersTab } from '@/components/tabs/OrdersTab';
import { MapTab } from '@/components/tabs/MapTab';
import { InvoiceTab } from '@/components/tabs/InvoiceTab';
import { InvestigationTab } from '@/components/tabs/InvestigationTab';
import { IssuesTab } from '@/components/tabs/IssuesTab';
import { IncompleteDataTab } from '@/components/tabs/IncompleteDataTab';

// Dialogs
import { RemoveOrdersDialog } from '@/components/RemoveOrdersDialog';
import { TabNavigation } from '@/components/TabNavigation';

const Index = () => {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const [showDataVerification, setShowDataVerification] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  
  // Calculate incomplete orders count
  const incompleteOrdersCount = orders.filter(order => 
    order.missingFields?.length > 0 || 
    !order.tripNumber || 
    order.tripNumber.trim() === '' ||
    !order.driver ||
    order.driver.trim() === ''
  ).length;

  // Auto hide incomplete orders from processing tabs
  useEffect(() => {
    if (incompleteOrdersCount > 0 && orders.length > 0 && activeTab === 'upload') {
      toast({
        title: "Incomplete data detected",
        description: `${incompleteOrdersCount} orders with missing data were found. These will be hidden until reviewed.`,
        variant: "warning",
      });
    }
  }, [incompleteOrdersCount, orders.length, activeTab]);

  const handleDataParsed = (parsedOrders: DeliveryOrder[]) => {
    if (parsedOrders.length === 0) {
      toast({
        title: "No orders found",
        description: "The uploaded file doesn't contain any valid orders",
        variant: "destructive",
      });
      return;
    }
    
    setOrders(parsedOrders);
    
    // Calculate incomplete orders
    const ordersWithMissingFields = parsedOrders.filter(order => order.missingFields.length > 0).length;
    const ordersWithMissingTripNumbers = parsedOrders.filter(order => !order.tripNumber || order.tripNumber.trim() === '').length;
    
    if (ordersWithMissingFields > 0 || ordersWithMissingTripNumbers > 0) {
      // If there are incomplete orders, go to the incomplete tab
      setActiveTab('incomplete');
      
      toast({
        title: "Upload successful with incomplete data",
        description: `${parsedOrders.length} orders loaded. ${ordersWithMissingFields} with incomplete data. ${ordersWithMissingTripNumbers} missing trip numbers.`,
        variant: "warning",
      });
    } else {
      // If all data is complete, go to the orders tab
      setActiveTab('orders');
      
      toast({
        title: "Upload successful",
        description: `${parsedOrders.length} orders loaded successfully.`,
      });
    }
    
    // Check for potential issues
    const detectedIssues = detectIssues(parsedOrders);
    setIssues(detectedIssues);
    
    if (detectedIssues.length > 0) {
      toast({
        description: `${detectedIssues.length} potential issue${detectedIssues.length > 1 ? 's' : ''} detected with your orders`,
        variant: "warning",
      });
    }
  };

  const handleOrdersUpdated = (updatedOrders: DeliveryOrder[]) => {
    setOrders(updatedOrders);
    
    // Re-check for issues after orders are updated
    const detectedIssues = detectIssues(updatedOrders);
    setIssues(detectedIssues);
  };

  const handleTabChange = (value: string) => {
    if (value !== 'upload' && orders.length === 0) {
      toast({
        title: "No orders available",
        description: "Please upload a CSV file first",
        variant: "destructive",
      });
      return;
    }
    
    setActiveTab(value);
  };

  const openDataVerification = () => {
    setShowDataVerification(true);
  };

  // Function to handle removing orders with missing trip numbers
  const handleRemoveOrdersWithMissingTripNumbers = () => {
    const ordersWithMissingTripNumbers = orders.filter(
      order => !order.tripNumber || order.tripNumber.trim() === ''
    );
    
    if (ordersWithMissingTripNumbers.length === 0) {
      toast({
        title: "No orders to remove",
        description: "All orders have valid trip numbers",
      });
      return;
    }
    
    // Show confirmation dialog
    setShowRemoveDialog(true);
  };
  
  // Function to confirm removal of orders with missing trip numbers
  const confirmRemoveOrders = () => {
    const originalCount = orders.length;
    const filteredOrders = removeOrdersWithMissingTripNumbers(orders);
    const removedCount = originalCount - filteredOrders.length;
    
    setOrders(filteredOrders);
    
    // Re-check for issues after orders are updated
    const detectedIssues = detectIssues(filteredOrders);
    setIssues(detectedIssues);
    
    setShowRemoveDialog(false);
    
    toast({
      title: "Orders removed",
      description: `Removed ${removedCount} order${removedCount !== 1 ? 's' : ''} with missing trip numbers. ${filteredOrders.length} order${filteredOrders.length !== 1 ? 's' : ''} remaining.`,
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader orderCount={orders.length} />
      
      <main className="container py-6 md:py-10 flex-1">
        <Tabs 
          value={activeTab}
          className="space-y-6"
        >
          <TabNavigation 
            activeTab={activeTab} 
            ordersCount={orders.length} 
            issuesCount={issues.length}
            incompleteCount={incompleteOrdersCount}
            onTabChange={handleTabChange} 
          />
          
          <TabsContent value="upload">
            <UploadTab 
              onDataParsed={handleDataParsed} 
              isLoading={isLoading} 
              setIsLoading={setIsLoading} 
            />
          </TabsContent>
          
          <TabsContent value="orders">
            <OrdersTab 
              orders={orders} 
              onOrdersUpdated={handleOrdersUpdated} 
              onRemoveOrdersWithMissingTripNumbers={handleRemoveOrdersWithMissingTripNumbers} 
              onOpenDataVerification={openDataVerification} 
            />
          </TabsContent>
          
          <TabsContent value="incomplete">
            <IncompleteDataTab
              orders={orders}
              onOrdersUpdated={handleOrdersUpdated}
              onOpenDataVerification={openDataVerification}
            />
          </TabsContent>
          
          <TabsContent value="map">
            <MapTab orders={orders} />
          </TabsContent>
          
          <TabsContent value="invoice">
            <InvoiceTab orders={orders} />
          </TabsContent>
          
          <TabsContent value="investigation">
            <InvestigationTab orders={orders} />
          </TabsContent>
          
          <TabsContent value="issues">
            <IssuesTab issues={issues} />
          </TabsContent>
        </Tabs>
      </main>
      
      <AppFooter />
      
      {/* Data Verification Dialog for Manual Corrections */}
      {orders.length > 0 && (
        <DataVerification 
          orders={orders}
          open={showDataVerification}
          onOpenChange={setShowDataVerification}
          onOrdersVerified={handleOrdersUpdated}
        />
      )}
      
      {/* Confirmation Dialog for Removing Orders */}
      <RemoveOrdersDialog 
        open={showRemoveDialog} 
        onOpenChange={setShowRemoveDialog} 
        onConfirm={confirmRemoveOrders} 
      />
    </div>
  );
};

export default Index;
