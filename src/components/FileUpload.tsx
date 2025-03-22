
"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { parseCSV, DeliveryOrder } from '@/utils/csvParser';
import { calculateDistances } from '@/utils/distanceCalculator';
import { toast } from '@/components/ui/use-toast';
import { ParsedDataSummary } from '@/utils/invoiceTypes';
import { AlertCircle, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FileUploadProps {
  onDataParsed: (orders: DeliveryOrder[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function FileUpload({ onDataParsed, isLoading, setIsLoading }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<DeliveryOrder[]>([]);
  const [dataSummary, setDataSummary] = useState<ParsedDataSummary | null>(null);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [processingStage, setProcessingStage] = useState<'idle' | 'parsing' | 'calculating-distances' | 'completed'>('idle');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const createDataSummary = (orders: DeliveryOrder[]): ParsedDataSummary => {
    // Count all missing fields by type
    const missingFieldsCount: Record<string, number> = {};
    orders.forEach(order => {
      order.missingFields.forEach(field => {
        missingFieldsCount[field] = (missingFieldsCount[field] || 0) + 1;
      });
    });

    // Get unique drivers
    const drivers = orders.map(order => order.driver || 'Unassigned');
    const uniqueDrivers = [...new Set(drivers)];

    // Count routes and multi-stop routes
    const tripNumbers = orders.map(order => order.tripNumber || '');
    const uniqueTripNumbers = [...new Set(tripNumbers.filter(Boolean))];
    
    // Count multi-stop routes (trip numbers that appear more than once)
    const tripNumberCount: Record<string, number> = {};
    tripNumbers.filter(Boolean).forEach(trip => {
      tripNumberCount[trip] = (tripNumberCount[trip] || 0) + 1;
    });
    
    const multiStopRouteCount = Object.values(tripNumberCount).filter(count => count > 1).length;

    // Check address quality
    const validPickupAddresses = orders.filter(o => o.pickup && o.pickup.trim() !== '').length;
    const validDropoffAddresses = orders.filter(o => o.dropoff && o.dropoff.trim() !== '').length;
    const missingAddresses = orders.filter(o => 
      (!o.pickup || o.pickup.trim() === '') || 
      (!o.dropoff || o.dropoff.trim() === '')
    ).length;

    return {
      totalOrders: orders.length,
      missingFields: {
        count: orders.filter(o => o.missingFields.length > 0).length,
        details: missingFieldsCount
      },
      drivers: {
        count: uniqueDrivers.length,
        names: uniqueDrivers
      },
      routeNumbers: {
        count: uniqueTripNumbers.length,
        multiStopRoutes: multiStopRouteCount
      },
      addressQuality: {
        validPickupAddresses,
        validDropoffAddresses,
        missingAddresses
      }
    };
  };

  const handleFile = async (file: File) => {
    // Check if file is CSV
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setProcessingStage('parsing');
    
    try {
      // Read file content
      const content = await readFileContent(file);
      
      // Parse CSV data
      const parsedData = parseCSV(content);
      
      if (parsedData.length === 0) {
        throw new Error("No valid data found in CSV file");
      }
      
      setParsedData(parsedData);
      
      // Generate data summary
      const summary = createDataSummary(parsedData);
      setDataSummary(summary);
      
      // Process distances
      setProcessingStage('calculating-distances');
      const ordersWithDistances = await calculateDistances(parsedData);
      
      setParsedData(ordersWithDistances);
      
      // Update summary with final data
      const finalSummary = createDataSummary(ordersWithDistances);
      setDataSummary(finalSummary);
      setProcessingStage('completed');
      
      // Show the summary dialog
      setShowSummaryDialog(true);
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error processing file",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      setProcessingStage('idle');
      setIsLoading(false);
    }
  };

  const handleConfirmData = () => {
    setShowSummaryDialog(false);
    
    if (parsedData.length > 0) {
      // Send data to parent component
      onDataParsed(parsedData);
      
      // Create a more specific description about missing fields
      let description = `Processed ${parsedData.length} orders successfully`;
      if (dataSummary && dataSummary.missingFields.count > 0) {
        description += `, ${dataSummary.missingFields.count} with incomplete data`;
      }
      
      toast({
        title: "File processed successfully",
        description,
      });
    }
    
    setIsLoading(false);
  };

  const handleCancelData = () => {
    setShowSummaryDialog(false);
    setProcessingStage('idle');
    setIsLoading(false);
    setParsedData([]);
    setDataSummary(null);
    
    toast({
      title: "Operation cancelled",
      description: "CSV processing was cancelled",
    });
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target) {
          resolve(event.target.result as string);
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      
      reader.onerror = () => {
        reject(new Error("Error reading file"));
      };
      
      reader.readAsText(file);
    });
  };

  return (
    <div className="w-full">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-all duration-300 ease-in-out
          ${dragActive ? 'border-primary/70 bg-primary/5' : 'border-gray-300 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-900/20'}
          glass-card backdrop-blur-sm
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          accept=".csv"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
        />
        
        <div className="flex flex-col items-center justify-center space-y-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            {processingStage === 'idle' && (
              <FileText className="h-6 w-6 text-primary" />
            )}
            {processingStage === 'parsing' && (
              <div className="animate-spin">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6 text-primary" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={2}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
              </div>
            )}
            {processingStage === 'calculating-distances' && (
              <div className="animate-spin">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6 text-primary" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={2}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
              </div>
            )}
            {processingStage === 'completed' && (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            )}
          </div>
          
          <div className="space-y-1">
            <p className="text-base font-medium">
              {processingStage === 'idle' && "Upload your CSV file"}
              {processingStage === 'parsing' && "Parsing CSV data..."}
              {processingStage === 'calculating-distances' && "Calculating distances..."}
              {processingStage === 'completed' && "Processing complete"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {processingStage === 'idle' && "Drag and drop or click to browse"}
              {processingStage === 'parsing' && "Analyzing CSV structure..."}
              {processingStage === 'calculating-distances' && "Validating addresses and routes..."}
              {processingStage === 'completed' && "Data ready for review"}
            </p>
          </div>
          
          {(processingStage === 'parsing' || processingStage === 'calculating-distances') && (
            <div className="w-full max-w-xs h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary shimmer" 
                style={{ width: processingStage === 'parsing' ? '50%' : '100%' }}
              ></div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        <p className="mb-2">Expected CSV format includes:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded flex items-center">
            <span className="w-4 h-4 mr-2 text-green-500"><CheckCircle2 size={16} /></span>
            Pickup Address, Delivery Address
          </div>
          <div className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded flex items-center">
            <span className="w-4 h-4 mr-2 text-green-500"><CheckCircle2 size={16} /></span>
            Driver Name, Trip Number
          </div>
          <div className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded flex items-center">
            <span className="w-4 h-4 mr-2 text-green-500"><CheckCircle2 size={16} /></span>
            Expected Ready/Pickup Times
          </div>
          <div className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded flex items-center">
            <span className="w-4 h-4 mr-2 text-green-500"><CheckCircle2 size={16} /></span>
            Expected Delivery Times
          </div>
        </div>
      </div>

      {/* Data Summary Dialog */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>CSV Data Summary</DialogTitle>
            <DialogDescription>
              Review the parsed data before proceeding
            </DialogDescription>
          </DialogHeader>
          
          {dataSummary && (
            <div className="space-y-4 my-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-primary/5 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    Orders Summary
                  </h4>
                  <p className="text-sm">Total Orders: <span className="font-medium">{dataSummary.totalOrders}</span></p>
                  <p className="text-sm">Routes: <span className="font-medium">{dataSummary.routeNumbers.count}</span></p>
                  <p className="text-sm">Multi-Stop Routes: <span className="font-medium">{dataSummary.routeNumbers.multiStopRoutes}</span></p>
                </div>
                
                <div className="bg-primary/5 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Data Quality
                  </h4>
                  <p className="text-sm">Orders with issues: 
                    <span className={`font-medium ${dataSummary.missingFields.count > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                      {' '}{dataSummary.missingFields.count}
                    </span>
                  </p>
                  <p className="text-sm">Valid pickup addresses: 
                    <span className="font-medium">
                      {' '}{dataSummary.addressQuality.validPickupAddresses}/{dataSummary.totalOrders}
                    </span>
                  </p>
                  <p className="text-sm">Valid dropoff addresses: 
                    <span className="font-medium">
                      {' '}{dataSummary.addressQuality.validDropoffAddresses}/{dataSummary.totalOrders}
                    </span>
                  </p>
                </div>
              </div>
              
              {/* Missing fields details */}
              {dataSummary.missingFields.count > 0 && (
                <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center text-orange-700 dark:text-orange-400">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Missing Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(dataSummary.missingFields.details).map(([field, count]) => (
                      <p key={field} className="text-sm">
                        {field === 'address' ? 'Delivery address' : 
                         field === 'pickupLocation' ? 'Pickup address' :
                         field === 'exReadyTime' ? 'Expected ready time' :
                         field === 'exDeliveryTime' ? 'Expected delivery time' :
                         field === 'actualPickupTime' ? 'Actual pickup time' :
                         field === 'actualDeliveryTime' ? 'Actual delivery time' :
                         field === 'tripNumber' ? 'Trip number' : field}:
                        <span className="font-medium text-orange-700 dark:text-orange-400"> {count} orders</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Drivers list */}
              <div className="bg-primary/5 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Drivers ({dataSummary.drivers.count})</h4>
                <div className="flex flex-wrap gap-2">
                  {dataSummary.drivers.names.slice(0, 10).map((driver, index) => (
                    <span key={index} className="px-2 py-1 bg-background rounded-md text-sm">
                      {driver}
                    </span>
                  ))}
                  {dataSummary.drivers.names.length > 10 && (
                    <span className="px-2 py-1 bg-background rounded-md text-sm">
                      +{dataSummary.drivers.names.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelData}>
              Cancel
            </Button>
            <Button onClick={handleConfirmData}>
              Confirm and Process
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
