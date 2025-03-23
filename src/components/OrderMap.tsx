
"use client"

import React, { useEffect } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { Button } from '@/components/ui/button';
import { MapPin, Info } from 'lucide-react';
import { MapLegend } from '@/components/map/MapLegend';
import { useMapbox } from '@/hooks/useMapbox';
import { toast } from '@/components/ui/use-toast';
import 'mapbox-gl/dist/mapbox-gl.css';

interface OrderMapProps {
  orders: DeliveryOrder[];
  showRoutes?: boolean;
  selectedDriver?: string | null;
  selectedDate?: string | null;
}

const OrderMap: React.FC<OrderMapProps> = ({ 
  orders, 
  showRoutes = false, 
  selectedDriver = null, 
  selectedDate = null 
}) => {
  const {
    mapContainer,
    isMapInitialized,
    isLoading,
    missingAddressCount,
    driverRoutes,
    mapLocations,
    geocodeAddresses,
    mapLoadError
  } = useMapbox(orders, showRoutes, selectedDriver, selectedDate);

  // Try to reinitialize map if there was an error
  useEffect(() => {
    if (mapLoadError) {
      toast({
        title: "Map failed to load",
        description: "There was a problem loading the map. Please try again later.",
        variant: "destructive",
      });
    }
  }, [mapLoadError]);

  // If map failed to load, show error message
  if (mapLoadError) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <h2 className="text-xl font-medium">Map Visualization</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Unable to load the map at this time
          </p>
        </div>
        
        <div className="rounded-lg border bg-card p-6 glass-card subtle-shadow space-y-4">
          <div className="flex items-center text-destructive space-x-2 mb-4">
            <Info size={20} />
            <p className="text-sm">There was a problem loading the map</p>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Please try again later or contact support if the problem persists.
          </p>
          
          <Button onClick={() => window.location.reload()} variant="outline">
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium">Map Visualization</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Visualize your delivery locations on a map
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {isLoading ? (
            <div className="text-sm text-gray-500">Loading map data...</div>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={geocodeAddresses}
              disabled={!isMapInitialized || orders.length === 0}
            >
              Refresh Map
            </Button>
          )}
        </div>
      </div>
      
      {missingAddressCount > 0 && (
        <div className="flex items-center p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-md">
          <Info className="text-amber-500 mr-2 h-5 w-5" />
          <p className="text-sm text-amber-800 dark:text-amber-400">
            {missingAddressCount} order{missingAddressCount !== 1 ? 's' : ''} with missing address data. 
            Showing {orders.length - missingAddressCount} orders on the map.
          </p>
        </div>
      )}
      
      <div className="rounded-md border overflow-hidden glass-card subtle-shadow">
        <div className="h-[28rem] relative">
          <div ref={mapContainer} className="absolute inset-0" />
          
          {isMapInitialized && (
            <MapLegend driverRoutes={driverRoutes} showRoutes={showRoutes} />
          )}
        </div>
      </div>
      
      {mapLocations.length === 0 && !isLoading && (
        <div className="text-center p-4 text-gray-500 dark:text-gray-400">
          <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-2" />
          <p>No locations have been geocoded yet.</p>
          <p className="text-sm">Make sure your orders have valid addresses and try refreshing the map.</p>
        </div>
      )}
    </div>
  );
};

export default OrderMap;
