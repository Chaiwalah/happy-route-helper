
import React from 'react';
import { Separator } from '@/components/ui/separator';

interface MapLegendProps {
  driverRoutes: Array<{
    driver: string;
    color: string;
    stops: Array<any>;
    totalDistance: number;
  }>;
  showRoutes: boolean;
}

export const MapLegend: React.FC<MapLegendProps> = ({ driverRoutes, showRoutes }) => {
  return (
    <div className="absolute top-4 left-4 p-3 bg-white dark:bg-gray-800 rounded-md shadow z-10 max-w-xs">
      <div className="text-sm font-medium mb-2">Map Legend</div>
      <Separator className="my-2" />
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
          <span className="text-xs">Pickup</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
          <span className="text-xs">Dropoff</span>
        </div>
      </div>
      {showRoutes && driverRoutes.length > 0 && (
        <>
          <Separator className="my-2" />
          <div className="text-xs font-medium mb-1">Driver Routes</div>
          <div className="max-h-40 overflow-y-auto">
            {driverRoutes.map((route, index) => (
              <div key={`${route.driver}-${index}`} className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <div className="w-3 h-1 mr-2" style={{ backgroundColor: route.color }}></div>
                  <span className="text-xs truncate">{route.driver}</span>
                </div>
                <span className="text-xs font-medium">{route.stops.length} stops</span>
              </div>
            ))}
          </div>
          
          <Separator className="my-2" />
          <div className="text-xs font-medium mb-1">Trip Statistics</div>
          <div className="max-h-40 overflow-y-auto">
            {driverRoutes.map((route, index) => (
              <div key={`stats-${route.driver}-${index}`} className="flex items-center justify-between mb-1">
                <span className="text-xs truncate">{route.driver}</span>
                <span className="text-xs font-medium">{route.totalDistance} mi</span>
              </div>
            ))}
            {driverRoutes.length > 1 && (
              <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs font-medium">Total</span>
                <span className="text-xs font-medium">
                  {driverRoutes.reduce((sum, route) => sum + route.totalDistance, 0).toFixed(1)} mi
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
