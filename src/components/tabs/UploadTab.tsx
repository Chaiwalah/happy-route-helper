
"use client"

import React from 'react';
import { FileUpload } from '@/components/FileUpload';
import { DeliveryOrder } from '@/utils/csvParser';

interface UploadTabProps {
  onDataParsed: (parsedOrders: DeliveryOrder[]) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

export const UploadTab: React.FC<UploadTabProps> = ({ 
  onDataParsed, 
  isLoading, 
  setIsLoading 
}) => {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Upload Delivery Data</h2>
        <p className="text-muted-foreground">
          Start by uploading your CSV file containing delivery order information
        </p>
      </div>
      
      <div className="max-w-2xl mx-auto">
        <FileUpload 
          onDataParsed={onDataParsed} 
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      </div>
      
      <div className="rounded-lg border bg-card p-6 glass-card subtle-shadow">
        <h3 className="font-medium text-lg mb-3">Expected CSV Format</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Your CSV file should include the following columns (column names can vary):
        </p>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-medium">Column</th>
                <th className="text-left py-2 px-3 font-medium">Description</th>
                <th className="text-left py-2 px-3 font-medium">Example</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 px-3 font-mono">driver</td>
                <td className="py-2 px-3">Driver name or ID</td>
                <td className="py-2 px-3 font-mono">John Smith</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3 font-mono">pickup</td>
                <td className="py-2 px-3">Pickup address</td>
                <td className="py-2 px-3 font-mono">123 Main St, City</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3 font-mono">dropoff</td>
                <td className="py-2 px-3">Delivery address</td>
                <td className="py-2 px-3 font-mono">456 Oak Ave, City</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3 font-mono text-primary font-medium">tripNumber</td>
                <td className="py-2 px-3">Unique route identifier</td>
                <td className="py-2 px-3 font-mono">TR-123456</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3 font-mono">timeWindowStart</td>
                <td className="py-2 px-3">Delivery start time</td>
                <td className="py-2 px-3 font-mono">9:00 AM</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3 font-mono">timeWindowEnd</td>
                <td className="py-2 px-3">Delivery end time</td>
                <td className="py-2 px-3 font-mono">11:00 AM</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3 font-mono">items</td>
                <td className="py-2 px-3">Items being delivered</td>
                <td className="py-2 px-3 font-mono">Medication, Package</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono">notes</td>
                <td className="py-2 px-3">Special instructions</td>
                <td className="py-2 px-3 font-mono">Call upon arrival</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
