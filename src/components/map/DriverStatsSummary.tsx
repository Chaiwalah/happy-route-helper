
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DriverStatsCard } from './DriverStatsCard';

interface DriverStatsSummaryProps {
  driverStats: Array<{
    driver: string;
    date: string;
    totalOrders: number;
    tripCount: number;
    totalDistance: number;
  }>;
}

export const DriverStatsSummary: React.FC<DriverStatsSummaryProps> = ({ driverStats }) => {
  if (driverStats.length === 0) {
    return null;
  }

  return (
    <ScrollArea className="h-[150px] border rounded-md p-4">
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Driver Trip Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {driverStats.map((stat, index) => (
            <DriverStatsCard
              key={`${stat.driver}-${stat.date}-${index}`}
              driver={stat.driver}
              date={stat.date}
              totalOrders={stat.totalOrders}
              tripCount={stat.tripCount}
              totalDistance={stat.totalDistance}
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};
