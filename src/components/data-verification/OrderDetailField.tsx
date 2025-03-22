
"use client"

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Edit } from 'lucide-react';
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';

interface OrderDetailFieldProps {
  label: string;
  fieldName: string;
  value: string;
  isCritical?: boolean;
  isEditing: boolean;
  editingValue: string;
  onEditStart: (field: string, value: string) => void;
  onEditChange: (value: string) => void;
  onEditSave: () => void;
  isError?: boolean;
  isNoise?: boolean;
}

export function OrderDetailField({
  label,
  fieldName,
  value,
  isCritical = false,
  isEditing,
  editingValue,
  onEditStart,
  onEditChange,
  onEditSave,
  isError = false,
  isNoise = false,
}: OrderDetailFieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label htmlFor={fieldName} className="font-medium flex items-center">
          {label}
          {isCritical && <Badge variant="secondary" className="ml-2">Critical</Badge>}
        </Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEditStart(fieldName, value || '')}
          className="h-6 w-6 p-0"
        >
          <Edit className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      {isEditing ? (
        <div className="flex space-x-2">
          <Input
            id={fieldName}
            value={editingValue}
            onChange={(e) => onEditChange(e.target.value)}
            className="h-8"
            autoFocus
          />
          <Button size="sm" onClick={onEditSave}>Save</Button>
        </div>
      ) : (
        <div className={`p-2 bg-muted/20 rounded text-sm ${
          isError || isNoise ? 'text-red-500 italic' : ''
        }`}>
          {isNoise 
            ? `${value} (will be excluded)` 
            : value?.trim() || 'Not specified'}
        </div>
      )}
    </div>
  );
}
