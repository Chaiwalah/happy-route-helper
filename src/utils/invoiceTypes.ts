
import { DeliveryOrder } from './csvParser';

export type Issue = {
  orderId: string;
  driver: string;
  message: string;
  details: string;
  severity: 'warning' | 'error';
};

export type InvoiceItem = {
  orderId: string;
  driver: string;
  pickup: string;
  dropoff: string;
  distance: number;
  stops: number;
  routeType: 'single' | 'multi-stop';
  baseCost: number;
  addOns: number;
  totalCost: number;
  recalculated?: boolean;  // Flag for manually recalculated distances
  originalDistance?: number; // Original distance before recalculation
  timeWindow?: string;     // Time window information
  orderIds?: string[];     // Array of all order IDs (for multi-stop routes)
  // New fields for PDF template
  patientName?: string;    // Patient name for medical deliveries
  address?: string;        // Full address
  city?: string;           // City
  zipCode?: string;        // Zip code
  date?: string;           // Delivery date
  pickupTime?: string;     // Time of pickup
  deliveryTime?: string;   // Time of delivery
  notes?: string;          // Delivery notes
};

export type DriverSummary = {
  name: string;
  orderCount: number;
  totalDistance: number;
  totalEarnings: number;
};

export type Invoice = {
  date: string;
  items: InvoiceItem[];
  totalDistance: number;
  totalCost: number;
  driverSummaries: DriverSummary[];
  recalculatedCount?: number; // Count of manually recalculated items
  status: 'draft' | 'reviewed' | 'finalized';
  lastModified: string;
  // New fields for PDF template
  weekEnding?: string;        // Week ending date for the invoice
  businessName?: string;      // Business name (pharmacy/lab/hospital)
  businessType?: 'pharmacy' | 'lab' | 'hospital' | 'other'; // Type of business
  contactPerson?: string;     // Contact person at the business
};

export type OrderRoute = {
  routeKey: string;
  orders: DeliveryOrder[];
  isMultiStop?: boolean;
};

export type ParsedDataSummary = {
  totalOrders: number;
  missingFields: {
    count: number;
    details: Record<string, number>;
  };
  drivers: {
    count: number;
    names: string[];
  };
  routeNumbers: {
    count: number;
    multiStopRoutes: number;
  };
  addressQuality: {
    validPickupAddresses: number;
    validDropoffAddresses: number;
    missingAddresses: number;
  };
};

// Advanced settings for invoice generation
export type InvoiceGenerationSettings = {
  allowManualDistanceAdjustment: boolean;
  flagDriverLoadThreshold: number; // Number of orders threshold for driver overload
  flagDistanceThreshold: number;   // Distance threshold for route warnings
  flagTimeWindowThreshold: number; // Minutes threshold for delivery time warnings
};

export type DistanceRecalculationRequest = {
  itemId: string;
  newDistance: number;
};

// PDF Template settings
export type PDFTemplateSettings = {
  templateType: 'standard' | 'contractor';
  showPatientDetails: boolean;
  includeDateRange: boolean;
  showBusinessLogo: boolean;
  showNotes: boolean;
};

// Invoice export options
export type InvoiceExportOptions = {
  format: 'pdf' | 'csv' | 'excel';
  template?: PDFTemplateSettings;
  sendToEmail?: string;
  sendToSlack?: boolean;
};
