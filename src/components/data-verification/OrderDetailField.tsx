
"use client"

import { useState, ReactNode } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle, 
  ChevronDown, 
  Edit2, 
  Info, 
  Save 
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';
import { FieldValidationStatus } from './hooks/useOrderVerification';

interface OrderDetailFieldProps {
  label: string;
  value: string;
  fieldName: string;
  isEditing: boolean;
  isSaving?: boolean;
  isError?: boolean;
  isNoise?: boolean;
  suggestedValues?: string[];
  validationMessage?: string | null;
  validationStatus?: FieldValidationStatus;
  onEdit: (fieldName: string, value: string) => void;
  onValueChange?: (value: string) => void;
  onSave?: () => void;
}

export function OrderDetailField({
  label,
  value,
  fieldName,
  isEditing,
  isSaving = false,
  isError = false,
  isNoise = false,
  suggestedValues = [],
  validationMessage = null,
  validationStatus = 'none',
  onEdit,
  onValueChange,
  onSave
}: OrderDetailFieldProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange?.(e.target.value);
  };

  const handleEditClick = () => {
    onEdit(fieldName, value);
  };

  const handleSaveClick = () => {
    if (onSave) {
      onSave();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onValueChange?.(suggestion);
    setShowSuggestions(false);
  };

  const getValidationIcon = () => {
    switch (validationStatus) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  // Determine input styling based on validation status
  const getInputStyle = () => {
    switch (validationStatus) {
      case 'valid':
        return 'border-green-500 ring-green-500/20 bg-green-50 dark:bg-green-900/20';
      case 'error':
        return 'border-red-500 ring-red-500/20 bg-red-50 dark:bg-red-900/20';
      case 'warning':
        return 'border-amber-500 ring-amber-500/20 bg-amber-50 dark:bg-amber-900/20';
      case 'info':
        return 'border-blue-500 ring-blue-500/20 bg-blue-50 dark:bg-blue-900/20';
      case 'success':
        return 'border-green-500 ring-green-500/20 bg-green-50 dark:bg-green-900/20';
      case 'none':
        if (isError || isNoise) {
          return 'text-red-500 italic bg-red-50 dark:bg-red-900/10';
        }
        return 'bg-muted/20';
      default:
        return 'bg-muted/20';
    }
  };
  
  // Render the appropriate content based on whether field is being edited
  return (
    <div className="border rounded-md p-3 mb-3 bg-card">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">{label}</span>
        {isEditing ? (
          <Button 
            variant="outline" 
            size="sm" 
            disabled={isSaving}
            onClick={handleSaveClick}
            className="h-7 gap-1"
          >
            {isSaving ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </Button>
        ) : (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleEditClick}
            className="h-7 gap-1 hover:bg-primary/10"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </div>
      
      {isEditing ? (
        <div className="space-y-2">
          <div className="relative">
            <div className="flex">
              <Input
                value={value}
                onChange={handleInputChange}
                placeholder={`Enter ${label.toLowerCase()}`}
                className={`pr-8 ${getInputStyle()} focus-visible:ring-1 focus-visible:ring-ring`}
              />
              {suggestedValues && suggestedValues.length > 0 && (
                <DropdownMenu open={showSuggestions} onOpenChange={setShowSuggestions}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-10 w-10 border-l ml-[-1px]"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[250px] max-h-[200px] overflow-auto">
                    {suggestedValues.map((suggestion) => (
                      <DropdownMenuItem
                        key={suggestion}
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            {getValidationIcon() && (
              <div className="absolute top-0 right-0 flex items-center h-full pr-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        {getValidationIcon()}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {validationMessage || 'Validation status'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
          
          {validationMessage && (
            <div className={`text-xs ${
              validationStatus === 'error' ? 'text-red-500' : 
              validationStatus === 'warning' ? 'text-amber-500' : 
              validationStatus === 'valid' ? 'text-green-500' : 
              'text-muted-foreground'
            }`}>
              {validationMessage}
            </div>
          )}
        </div>
      ) : (
        <div className={`rounded py-2 px-3 border font-medium text-sm ${getInputStyle()}`}>
          {value || 'Not set'}
        </div>
      )}
    </div>
  );
}
