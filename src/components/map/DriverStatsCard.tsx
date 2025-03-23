
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface DriverStatsCardProps {
  driver: string;
  date: string;
  totalOrders: number;
  tripCount: number;
  totalDistance: number;
}

export const DriverStatsCard: React.FC<DriverStatsCardProps> = ({
  driver,
  date,
  totalOrders,
  tripCount,
  totalDistance
}) => {
  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader className="p-3 pb-0">
        <CardTitle className="text-sm flex justify-between items-center">
          <span>{driver}</span>
          <Badge variant="outline" className="text-xs">
            {date}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        <div className="grid grid-cols-3 text-xs gap-2">
          <div>
            <p className="text-gray-500">Orders</p>
            <p className="font-medium">{totalOrders}</p>
          </div>
          <div>
            <p className="text-gray-500">Trips</p>
            <p className="font-medium">{tripCount}</p>
          </div>
          <div>
            <p className="text-gray-500">Distance</p>
            <p className="font-medium">{totalDistance} mi</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
