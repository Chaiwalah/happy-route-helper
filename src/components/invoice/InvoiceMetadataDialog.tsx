
"use client"

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface InvoiceMetadata {
  weekEnding: string;
  businessName: string;
  businessType: 'pharmacy' | 'lab' | 'hospital' | 'other';
  contactPerson: string;
}

interface InvoiceMetadataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metadata: InvoiceMetadata;
  onMetadataChange: (metadata: InvoiceMetadata) => void;
  onSave: () => void;
}

export function InvoiceMetadataDialog({
  open,
  onOpenChange,
  metadata,
  onMetadataChange,
  onSave
}: InvoiceMetadataDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invoice Business Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="weekEnding">Week Ending</Label>
            <Input 
              id="weekEnding" 
              type="date" 
              value={metadata.weekEnding} 
              onChange={(e) => onMetadataChange({...metadata, weekEnding: e.target.value})}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name</Label>
            <Input 
              id="businessName" 
              value={metadata.businessName} 
              onChange={(e) => onMetadataChange({...metadata, businessName: e.target.value})}
              placeholder="e.g., ABC Pharmacy"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="businessType">Business Type</Label>
            <div className="flex space-x-2 mt-1">
              <Button
                type="button"
                variant={metadata.businessType === 'pharmacy' ? 'default' : 'outline'}
                onClick={() => onMetadataChange({...metadata, businessType: 'pharmacy'})}
                className="flex-1"
              >
                Pharmacy
              </Button>
              <Button
                type="button"
                variant={metadata.businessType === 'lab' ? 'default' : 'outline'}
                onClick={() => onMetadataChange({...metadata, businessType: 'lab'})}
                className="flex-1"
              >
                Lab
              </Button>
              <Button
                type="button"
                variant={metadata.businessType === 'hospital' ? 'default' : 'outline'}
                onClick={() => onMetadataChange({...metadata, businessType: 'hospital'})}
                className="flex-1"
              >
                Hospital
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contactPerson">Contact Person</Label>
            <Input 
              id="contactPerson" 
              value={metadata.contactPerson} 
              onChange={(e) => onMetadataChange({...metadata, contactPerson: e.target.value})}
              placeholder="e.g., John Smith"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave}>
            Update Invoice Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
