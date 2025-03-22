
export interface Issue {
  orderId: string;
  message: string;
  type: 'warning' | 'error' | 'info';
  details?: any;
  driver?: string;
  severity?: 'error' | 'warning' | 'info';
}

export interface InvoiceGenerationSettings {
  baseRate: number;
  mileageRate: number;
  additionalStopFee: number;
  distanceThreshold: number;
  allowManualDistanceAdjustment: boolean;
  applyUrbanFee: boolean;
  urbanFeeAmount: number;
  applyRushFee: boolean;
  rushFeePercentage: number;
  calculateTotalMileage: boolean;
  flagDriverLoadThreshold?: number;
  flagDistanceThreshold?: number;
  flagTimeWindowThreshold?: number;
}

export interface PDFTemplateSettings {
  template: 'standard' | 'contractor';
  showItemDetails: boolean;
  includeDateRange: boolean;
  showBusinessLogo: boolean;
  showNotes: boolean;
  companyName: string;
  companyAddress: string;
  companyContact: string;
  showDriverDetails: boolean;
  showPatientDetails: boolean;
  color: string;
}

export interface InvoiceMetadata {
  businessName: string;
  businessAddress: string;
  businessContact: string;
  invoiceNumber: string;
  dateIssued: string;
  dateDue: string;
  notes: string;
}

export interface InvoiceItem {
  routeKey?: string;
  tripNumber?: string;
  orderId: string;
  driver: string;
  pickup?: string;
  dropoff?: string;
  distance: number;
  stops?: number;
  billableStops?: number;
  hasPumpPickups?: boolean;
  pumpPickupCount?: number;
  routeType?: 'single' | 'multi-stop';
  baseCost: number;
  addOns: number;
  totalCost: number;
  timeWindow?: string;
  orderIds?: string[];
  orders?: any[];
  cost?: number;
  originalDistance?: number;
  recalculated?: boolean;
  patientName?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  date?: string;
  pickupTime?: string;
  deliveryTime?: string;
  notes?: string;
}

export interface DriverSummary {
  driver: string;
  trips: number;
  totalDistance: number;
  totalEarnings: number;
}

export interface Invoice {
  id: string;
  date: string;
  items: InvoiceItem[];
  totalDistance: number;
  totalCost: number;
  driverSummaries?: DriverSummary[];
  status: 'draft' | 'reviewed' | 'finalized';
  lastModified: string;
  weekEnding?: string;
  businessName?: string;
  businessType?: string;
  contactPerson?: string;
  businessAddress?: string;
  businessContact?: string;
  recalculatedCount?: number;
}

export interface ParsedDataSummary {
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
    ordersWithTripNumbers: number;
    ordersWithoutTripNumbers: number;
  };
  addressQuality: {
    validPickupAddresses: number;
    validDropoffAddresses: number;
    missingAddresses: number;
  };
}
