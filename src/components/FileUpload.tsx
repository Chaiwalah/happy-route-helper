
"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { parseCSV, DeliveryOrder } from '@/utils/csvParser';
import { calculateDistances } from '@/utils/distanceCalculator';
import { toast } from '@/components/ui/use-toast';

interface FileUploadProps {
  onDataParsed: (orders: DeliveryOrder[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function FileUpload({ onDataParsed, isLoading, setIsLoading }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);

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
    
    try {
      // Read file content
      const content = await readFileContent(file);
      
      // Parse CSV data
      const parsedData = parseCSV(content);
      
      if (parsedData.length === 0) {
        throw new Error("No valid data found in CSV file");
      }
      
      // Calculate distances for each route - this will use CSV distance if available
      const ordersWithDistances = await calculateDistances(parsedData);
      
      // Count orders with missing fields
      const ordersWithMissingFields = ordersWithDistances.filter(o => o.missingFields.length > 0);
      
      // Send data to parent component
      onDataParsed(ordersWithDistances);
      
      // Create a more specific description about missing fields
      let description = `Loaded ${parsedData.length} orders`;
      if (ordersWithMissingFields.length > 0) {
        description += `, ${ordersWithMissingFields.length} with incomplete data`;
      }
      
      toast({
        title: "File processed successfully",
        description,
      });
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error processing file",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
              />
            </svg>
          </div>
          
          <div className="space-y-1">
            <p className="text-base font-medium">
              {isLoading ? "Processing..." : "Upload your CSV file"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Drag and drop or click to browse
            </p>
          </div>
          
          {isLoading && (
            <div className="w-full max-w-xs h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-primary shimmer" style={{ width: '100%' }}></div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        <p>Expected CSV format includes: <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">Pickup Address, Delivery Address, Ex. Ready Time, Ex. Delivery Time, Distance (optional)</span></p>
      </div>
    </div>
  );
}
