export interface InvoiceGenerationSettings {
  allowManualDistanceAdjustment: boolean;
  flagDriverLoadThreshold: number;
  flagDistanceThreshold: number;
  flagTimeWindowThreshold: number;
}

export interface Issue {
  orderId: string | 'multiple';
  driver: string;
  message: string;
  details: string;
  severity: 'warning' | 'error';
}

export interface OrderRoute {
  routeKey: string;
  orders: any[];
  isMultiStop: boolean;
  tripNumber?: string | null;
}

export interface InvoiceItem {
  routeKey: string;
  tripNumber?: string | null;
  driver: string;
  orderIds: string[];
  distance: number;
  cost: number;
  orders: any[];
}

export interface Invoice {
  id: string;
  date: string;
  weekEnding: string;
  businessName: string;
  businessType: 'pharmacy' | 'lab' | 'hospital' | 'other';
  contactPerson: string;
  items: InvoiceItem[];
  totalCost: number;
  status: 'pending' | 'reviewed' | 'finalized';
}

// Extend ParsedDataSummary type to include trip number quality metrics
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
    ordersWithTripNumbers?: number;
    ordersWithoutTripNumbers?: number;
  };
  addressQuality: {
    validPickupAddresses: number;
    validDropoffAddresses: number;
    missingAddresses: number;
  };
}
