"use client"

import { useState, ReactNode } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Edit, Loader2 } from 'lucide-react';
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';
import { FieldValidationStatus } from './hooks/useOrderVerification';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface OrderDetailFieldProps {
  label: ReactNode;
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
  isSaving?: boolean;
  suggestions?: string[];
  validationStatus?: FieldValidationStatus;
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
  isSaving = false,
  suggestions = [],
  validationStatus = 'none'
}: OrderDetailFieldProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onEditSave();
    }
  };
  
  const handleSelectSuggestion = (suggestion: string) => {
    onEditChange(suggestion);
    setShowSuggestions(false);
  };
  
  const hasSuggestions = suggestions && suggestions.length > 0;
  
  // Get the appropriate styling based on validation status
  const getValidationColorClass = () => {
    switch (validationStatus) {
      case 'valid':
        return 'border-green-500 ring-green-500/20 bg-green-50 dark:bg-green-900/20';
      case 'invalid':
        return 'border-red-500 ring-red-500/20 bg-red-50 dark:bg-red-900/20';
      case 'warning':
        return 'border-amber-500 ring-amber-500/20 bg-amber-50 dark:bg-amber-900/20';
      case 'none':
        if (isError || isNoise) {
          return 'text-red-500 italic bg-red-50 dark:bg-red-900/10';
        }
        return 'bg-muted/20';
      default:
        return 'bg-muted/20';
    }
  };
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label htmlFor={fieldName} className="font-medium flex items-center">
          {label}
          {isCritical && <Badge variant="secondary" className="ml-2">Critical</Badge>}
          {validationStatus === 'valid' && (
            <Check className="h-3.5 w-3.5 ml-1 text-green-500" />
          )}
        </Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEditStart(fieldName, value || '')}
          className="h-6 w-6 p-0"
          disabled={isEditing || isSaving}
        >
          <Edit className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      {isEditing ? (
        <>
          {hasSuggestions ? (
            <Popover open={showSuggestions} onOpenChange={setShowSuggestions}>
              <PopoverTrigger asChild>
                <div className="flex space-x-2">
                  <Input
                    id={fieldName}
                    value={editingValue}
                    onChange={(e) => onEditChange(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleKeyDown}
                    className="h-8 w-full"
                    autoFocus
                  />
                  <Button 
                    size="sm" 
                    onClick={onEditSave}
                    disabled={isSaving}
                    className="flex items-center gap-1"
                  >
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search suggestions..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No suggestions found.</CommandEmpty>
                    <CommandGroup>
                      {suggestions.map((suggestion) => (
                        <CommandItem
                          key={suggestion}
                          value={suggestion}
                          onSelect={() => handleSelectSuggestion(suggestion)}
                          className="flex cursor-pointer"
                        >
                          {suggestion}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : (
            <div className="flex space-x-2">
              <Input
                id={fieldName}
                value={editingValue}
                onChange={(e) => onEditChange(e.target.value)}
                className="h-8"
                autoFocus
                onKeyDown={handleKeyDown}
              />
              <Button 
                size="sm" 
                onClick={onEditSave}
                disabled={isSaving}
                className="flex items-center gap-1"
              >
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className={`p-2 rounded text-sm border ${getValidationColorClass()}`}>
          {isNoise 
            ? `${value} (will be excluded)` 
            : value?.trim() || 'Not specified'}
        </div>
      )}
    </div>
  );
}
