
"use client"

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Invoice, PDFTemplateSettings } from '@/utils/invoiceTypes';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PDFPreviewProps {
  invoice: Invoice;
  templateSettings: PDFTemplateSettings;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({ invoice, templateSettings }) => {
  // Format dates
  const weekEnding = invoice.weekEnding || invoice.date;
  
  return (
    <Card className="shadow-md">
      <CardContent className="p-6 print:p-0">
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h1 className="font-bold text-2xl">CONTRACTOR INVOICING SHEET</h1>
              <p className="text-muted-foreground">Week Ending: {weekEnding}</p>
            </div>
            
            {templateSettings.showBusinessLogo && (
              <div className="w-24 h-16 bg-gray-200 flex items-center justify-center rounded">
                <span className="text-sm text-muted-foreground">Logo</span>
              </div>
            )}
          </div>
          
          {/* Business and Driver Information */}
          <div className="grid grid-cols-2 gap-4 border-b pb-4">
            <div>
              <p className="font-semibold">Pharmacy/Lab/Hospital:</p>
              <p>{invoice.businessName || 'Not Specified'}</p>
              {invoice.contactPerson && (
                <p className="text-sm text-muted-foreground">Contact: {invoice.contactPerson}</p>
              )}
            </div>
            <div>
              <p className="font-semibold">Driver:</p>
              <p>{invoice.items[0]?.driver || 'Multiple Drivers'}</p>
              <p className="text-sm text-muted-foreground">Business Name: Driver Services LLC</p>
            </div>
          </div>
          
          {/* Order Details Table */}
          <div>
            <h2 className="font-bold text-lg mb-2">DELIVERIES</h2>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[60px]">#</TableHead>
                    {templateSettings.showPatientDetails && (
                      <TableHead>Patient</TableHead>
                    )}
                    <TableHead>Address</TableHead>
                    <TableHead>City/Zip</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Pick Up</TableHead>
                    <TableHead>Delivery</TableHead>
                    {templateSettings.showNotes && (
                      <TableHead>Notes</TableHead>
                    )}
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item, index) => (
                    <TableRow key={`${item.orderId}-${index}`}>
                      <TableCell>{index + 1}</TableCell>
                      {templateSettings.showPatientDetails && (
                        <TableCell>{item.patientName || 'N/A'}</TableCell>
                      )}
                      <TableCell className="max-w-[200px] truncate" title={item.dropoff}>
                        {item.address || item.dropoff}
                      </TableCell>
                      <TableCell>
                        {item.city ? `${item.city}, ` : ''}
                        {item.zipCode || 'N/A'}
                      </TableCell>
                      <TableCell>{item.date || invoice.date}</TableCell>
                      <TableCell>{item.pickupTime || 'N/A'}</TableCell>
                      <TableCell>{item.deliveryTime || 'N/A'}</TableCell>
                      {templateSettings.showNotes && (
                        <TableCell className="max-w-[150px] truncate" title={item.notes}>
                          {item.notes || 'N/A'}
                        </TableCell>
                      )}
                      <TableCell className="text-right">${item.totalCost.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          
          {/* Summary */}
          <div className="flex justify-end pt-4">
            <div className="w-64">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-semibold">Total Deliveries:</TableCell>
                    <TableCell className="text-right">{invoice.items.length}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold">Total Distance:</TableCell>
                    <TableCell className="text-right">{invoice.totalDistance.toFixed(1)} mi</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold">Total Amount:</TableCell>
                    <TableCell className="text-right font-bold">${invoice.totalCost.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
          
          {/* Signature */}
          <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-8">
            <div>
              <p className="font-semibold">Contractor Signature:</p>
              <div className="h-12 border-b mt-8"></div>
            </div>
            <div>
              <p className="font-semibold">Date:</p>
              <div className="h-12 border-b mt-8"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
