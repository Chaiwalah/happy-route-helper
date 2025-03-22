
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

interface DistanceRecalculationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemToRecalculate: { index: number; distance: number } | null;
  onItemToRecalculateChange: (item: { index: number; distance: number } | null) => void;
  onConfirm: () => void;
}

export function DistanceRecalculationDialog({
  open,
  onOpenChange,
  itemToRecalculate,
  onItemToRecalculateChange,
  onConfirm
}: DistanceRecalculationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onItemToRecalculateChange(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Route Distance</DialogTitle>
        </DialogHeader>
        
        {itemToRecalculate && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Manually adjust the distance for this route. This will recalculate the cost.
            </p>
            
            <div className="flex items-center space-x-4">
              <Label htmlFor="distance" className="w-24">Distance (mi)</Label>
              <Input 
                id="distance" 
                type="number" 
                min="0.1" 
                step="0.1" 
                value={itemToRecalculate.distance} 
                onChange={(e) => onItemToRecalculateChange({
                  ...itemToRecalculate,
                  distance: parseFloat(e.target.value) || 0
                })}
                className="flex-1"
              />
            </div>
            
            <p className="text-xs text-muted-foreground italic">
              Original API-calculated distances are based on actual driving routes. Manual adjustments will be flagged in the invoice.
            </p>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Update Distance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
