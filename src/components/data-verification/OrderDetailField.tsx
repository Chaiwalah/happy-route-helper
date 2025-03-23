
import React, { useRef, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export interface OrderDetailFieldProps {
  label: string;
  fieldName: string;
  value: string;
  isEditing: boolean;
  isError?: boolean;
  isNoise?: boolean;
  isWarning?: boolean;
  isSaving?: boolean;
  suggestedValues?: string[];
  validationStatus?: FieldValidationStatus;
  validationMessage?: string;
  onEdit: (field: string, value: string) => void;
  onValueChange: (value: string) => void;
  onSave: () => void;
}

export function OrderDetailField({
  label,
  fieldName,
  value,
  isEditing,
  isError = false,
  isNoise = false,
  isWarning = false,
  isSaving = false,
  suggestedValues = [],
  validationStatus = 'valid',
  validationMessage = '',
  onEdit,
  onValueChange,
  onSave
}: OrderDetailFieldProps) {
  // Always ensure we have a string value, even if undefined or null
  const safeValue = value || '';
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Handle keyboard events for saving on Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSave();
    }
  };

  // Determine color based on validation status and warning flag
  const getStatusColorClass = () => {
    if (validationStatus === 'error' || isError) return 'text-destructive';
    if (validationStatus === 'warning' || isNoise || isWarning) return 'text-amber-500';
    return 'text-foreground';
  };

  // Get border color class
  const getBorderColorClass = () => {
    if (validationStatus === 'error' || isError) return 'border-destructive';
    if (validationStatus === 'warning' || isNoise || isWarning) return 'border-amber-500';
    return 'border-input';
  };

  // Get status icon
  const getStatusIcon = () => {
    if (validationStatus === 'error' || isError) 
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (validationStatus === 'warning' || isNoise || isWarning)
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
    if (validationStatus === 'valid') 
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    return null;
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className={`text-sm font-medium ${getStatusColorClass()}`}>
          {label}
        </label>
        {getStatusIcon()}
      </div>
      
      {isEditing ? (
        <div className="relative">
          {suggestedValues && suggestedValues.length > 0 ? (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <div className="flex relative">
                  <Input
                    ref={inputRef}
                    value={safeValue}
                    onChange={(e) => onValueChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={`pr-10 ${getBorderColorClass()}`}
                    placeholder={`Enter ${label.toLowerCase()}`}
                  />
                  {isSaving && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Command>
                  <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
                  <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup>
                      {suggestedValues.map((suggestion) => (
                        <CommandItem 
                          key={suggestion}
                          onSelect={() => {
                            onValueChange(suggestion);
                            setOpen(false);
                          }}
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
            <div className="flex relative">
              <Input
                ref={inputRef}
                value={safeValue}
                onChange={(e) => onValueChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className={`pr-10 ${getBorderColorClass()}`}
                placeholder={`Enter ${label.toLowerCase()}`}
              />
              {isSaving && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end mt-1 space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onEdit(fieldName, safeValue)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              size="sm"
              onClick={onSave}
              disabled={isSaving}
            >
              Save
            </Button>
          </div>
          
          {validationMessage && (
            <div className={`text-xs mt-1 ${getStatusColorClass()}`}>
              {validationMessage}
            </div>
          )}
        </div>
      ) : (
        <div 
          className={`
            px-3 py-2 rounded-md border bg-background cursor-pointer hover:bg-muted/50
            ${safeValue ? '' : 'italic text-muted-foreground'} 
            ${getBorderColorClass()}
          `}
          onClick={() => onEdit(fieldName, safeValue)}
        >
          {safeValue || `No ${label.toLowerCase()} specified`}
        </div>
      )}
    </div>
  );
}
