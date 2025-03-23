
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, XCircle, SortAsc, SortDesc } from 'lucide-react';

interface MapFiltersProps {
  drivers: string[];
  selectedDriver: string | null;
  setSelectedDriver: (driver: string | null) => void;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  sortByDistance: 'asc' | 'desc' | null;
  toggleSortByDistance: () => void;
  resetFilters: () => void;
}

export const MapFilters: React.FC<MapFiltersProps> = ({
  drivers,
  selectedDriver,
  setSelectedDriver,
  selectedDate,
  setSelectedDate,
  sortByDistance,
  toggleSortByDistance,
  resetFilters
}) => {
  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="space-y-2">
        <Label htmlFor="driver-select">Filter by Driver</Label>
        <Select
          value={selectedDriver || "all-drivers"}
          onValueChange={(value) => setSelectedDriver(value === "all-drivers" ? null : value)}
        >
          <SelectTrigger id="driver-select" className="w-[200px]">
            <SelectValue placeholder="All Drivers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-drivers">All Drivers</SelectItem>
            {drivers.map(driver => (
              <SelectItem key={driver} value={driver}>{driver}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date-select">Filter by Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date-select"
              variant="outline"
              className={`w-[200px] justify-start text-left font-normal ${
                !selectedDate && "text-muted-foreground"
              }`}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, 'PPP') : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={toggleSortByDistance}
        className={sortByDistance ? "bg-blue-50 dark:bg-blue-950" : ""}
        title="Sort by distance"
      >
        {sortByDistance === 'asc' ? (
          <SortAsc className="h-4 w-4 text-blue-600" />
        ) : sortByDistance === 'desc' ? (
          <SortDesc className="h-4 w-4 text-blue-600" />
        ) : (
          <SortAsc className="h-4 w-4" />
        )}
      </Button>

      {(selectedDriver || selectedDate || sortByDistance) && (
        <Button 
          variant="outline" 
          onClick={resetFilters}
          className="flex items-center gap-1"
        >
          <XCircle className="h-4 w-4" />
          Reset Filters
        </Button>
      )}
    </div>
  );
};
