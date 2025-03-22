
"use client"

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import { InvoiceGenerationSettings } from '@/utils/invoiceTypes';

interface InvoiceSettingsProps {
  settings: InvoiceGenerationSettings;
  onSettingsChange: (settings: InvoiceGenerationSettings) => void;
}

export function InvoiceSettings({ settings, onSettingsChange }: InvoiceSettingsProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8" title="Invoice Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Invoice Generation Settings</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="driver-threshold" className="text-xs">Driver load threshold</Label>
              <span className="text-xs font-mono">{settings.flagDriverLoadThreshold} orders</span>
            </div>
            <Slider 
              id="driver-threshold"
              min={5}
              max={20}
              step={1}
              value={[settings.flagDriverLoadThreshold]}
              onValueChange={(value) => onSettingsChange({ 
                ...settings, 
                flagDriverLoadThreshold: value[0] 
              })}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="distance-threshold" className="text-xs">Distance warning threshold</Label>
              <span className="text-xs font-mono">{settings.flagDistanceThreshold} miles</span>
            </div>
            <Slider 
              id="distance-threshold"
              min={50}
              max={200}
              step={10}
              value={[settings.flagDistanceThreshold]}
              onValueChange={(value) => onSettingsChange({ 
                ...settings, 
                flagDistanceThreshold: value[0] 
              })}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="time-threshold" className="text-xs">Time window threshold</Label>
              <span className="text-xs font-mono">{settings.flagTimeWindowThreshold} min</span>
            </div>
            <Slider 
              id="time-threshold"
              min={15}
              max={60}
              step={5}
              value={[settings.flagTimeWindowThreshold]}
              onValueChange={(value) => onSettingsChange({ 
                ...settings, 
                flagTimeWindowThreshold: value[0] 
              })}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
