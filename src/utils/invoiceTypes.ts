export interface Issue {
  orderId: string;
  message: string;
  type: 'warning' | 'error' | 'info';
  details?: any;
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
