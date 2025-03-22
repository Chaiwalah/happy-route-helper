
"use client"

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Invoice } from '@/utils/invoiceCalculator';

interface DriverSummaryProps {
  invoice: Invoice;
}

export const DriverSummary: React.FC<DriverSummaryProps> = ({ invoice }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Driver Summary</CardTitle>
        <CardDescription>
          Performance summary by driver
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50/80 dark:bg-gray-900/50">
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Distance</TableHead>
                <TableHead className="text-right">Earnings</TableHead>
                <TableHead className="text-right">Avg. per Order</TableHead>
                <TableHead className="text-right">Avg. per Mile</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.driverSummaries.map((summary) => (
                <TableRow key={summary.driver} className="animate-slide-in">
                  <TableCell className="font-medium">{summary.driver}</TableCell>
                  <TableCell className="text-right">{summary.trips}</TableCell>
                  <TableCell className="text-right">{summary.totalDistance.toFixed(1)} mi</TableCell>
                  <TableCell className="text-right font-medium">${summary.totalEarnings.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    ${(summary.totalEarnings / summary.trips).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ${(summary.totalEarnings / (summary.totalDistance || 1)).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
