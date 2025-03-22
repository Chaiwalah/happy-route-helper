
"use client"

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InvoiceMetadata } from '@/utils/invoiceTypes';

interface InvoiceMetadataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metadata: InvoiceMetadata;
  onMetadataChange: (metadata: InvoiceMetadata) => void;
  onSave: (metadata: InvoiceMetadata) => void;
}

export const InvoiceMetadataDialog: React.FC<InvoiceMetadataDialogProps> = ({
  open,
  onOpenChange,
  metadata,
  onMetadataChange,
  onSave,
}) => {
  const handleSave = () => {
    onSave(metadata);
  };

  const handleChange = (field: keyof InvoiceMetadata, value: string) => {
    onMetadataChange({
      ...metadata,
      [field]: value,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Business Information</DialogTitle>
          <DialogDescription>
            Enter your business details to be displayed on the invoice
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="businessName" className="text-right">
              Business Name
            </Label>
            <Input
              id="businessName"
              value={metadata.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="businessAddress" className="text-right">
              Address
            </Label>
            <Input
              id="businessAddress"
              value={metadata.businessAddress}
              onChange={(e) => handleChange('businessAddress', e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="businessContact" className="text-right">
              Contact
            </Label>
            <Input
              id="businessContact"
              value={metadata.businessContact}
              onChange={(e) => handleChange('businessContact', e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="invoiceNumber" className="text-right">
              Invoice #
            </Label>
            <Input
              id="invoiceNumber"
              value={metadata.invoiceNumber}
              onChange={(e) => handleChange('invoiceNumber', e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dateIssued" className="text-right">
              Date Issued
            </Label>
            <Input
              id="dateIssued"
              type="date"
              value={metadata.dateIssued}
              onChange={(e) => handleChange('dateIssued', e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dateDue" className="text-right">
              Due Date
            </Label>
            <Input
              id="dateDue"
              type="date"
              value={metadata.dateDue}
              onChange={(e) => handleChange('dateDue', e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right pt-2">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={metadata.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="col-span-3"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
