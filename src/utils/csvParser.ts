export type DeliveryOrder = {
  id: string;
  driver?: string;
  pickup?: string;
  dropoff?: string;
  timeWindowStart?: string;      // Expected pickup time
  timeWindowEnd?: string;        // Expected delivery time
  exReadyTime?: string;          // Expected pickup time
  exDeliveryTime?: string;       // Expected delivery time
  actualPickupTime?: string;     // Actual pickup time
  actualDeliveryTime?: string;   // Actual delivery time
  items?: string;
  notes?: string;
  distance?: number;             // Added distance field that might come from CSV
  estimatedDistance?: number;    // Calculated distance if not in CSV
  missingAddress?: boolean;      // Keeping for backward compatibility
  missingFields: string[];       // Array to track all missing fields
  tripNumber?: string;           // Added TripNumber field for route batching
  orderType?: string;            // Type of order (e.g. "PUMP_ONLY", "DELIVERY")
  isPumpPickup?: boolean;        // Flag to identify pump pickup orders
};

/**
 * Enhanced CSV parser with robust trip number and driver handling
 */
export const parseCSV = (content: string): DeliveryOrder[] => {
  // Basic validation of content
  if (!content || content.trim() === '') {
    return [];
  }
  
  // Split by new lines and remove empty lines
  const lines = content.split('\n').filter(line => line && line.trim() !== '');
  
  if (lines.length === 0) {
    return [];
  }
  
  // Extract headers from first line
  const headers = lines[0].split(',').map(h => h?.trim() || '');
  
  if (headers.length === 0) {
    return []; 
  }
  
  // Check which columns exist in the CSV with comprehensive matching
  const columnsExist = {
    items: headers.some(header => 
      ['items', 'item description', 'items description', 'product', 'products'].includes(header.toLowerCase())
    ),
    distance: headers.some(header => 
      ['distance', 'miles', 'mileage', 'total distance'].includes(header.toLowerCase())
    ),
    pickup: headers.some(header => 
      ['pickup address 1', 'pickup location', 'pickup address', 'pickup'].includes(header.toLowerCase())
    ),
    dropoff: headers.some(header => 
      ['delivery address 1', 'delivery location', 'delivery address', 'dropoff', 'destination'].includes(header.toLowerCase())
    ),
    exReadyTime: headers.some(header => 
      ['ex. ready time', 'expected ready time', 'pickup time', 'time window start'].includes(header.toLowerCase())
    ),
    exDeliveryTime: headers.some(header => 
      ['ex. delivery time', 'expected delivery time', 'delivery time', 'time window end'].includes(header.toLowerCase())
    ),
    actualPickupTime: headers.some(header => 
      ['actual pickup time'].includes(header.toLowerCase())
    ),
    actualDeliveryTime: headers.some(header => 
      ['actual delivery time'].includes(header.toLowerCase())
    ),
    notes: headers.some(header => 
      ['notes', 'special instructions', 'instructions'].includes(header.toLowerCase())
    ),
    driver: headers.some(header => 
      ['driver', 'driver name', 'courier'].includes(header.toLowerCase())
    ),
    tripNumber: headers.some(header => 
      ['trip number', 'trip #', 'tripnumber', 'trip', 'route number', 'route #', 'route'].includes(header.toLowerCase())
    )
  };
  
  // Log all trip number related headers for debugging
  const tripNumberHeaders = headers.filter(header => 
    header && ['trip number', 'trip #', 'tripnumber', 'trip', 'route number', 'route #', 'route']
      .includes(header.toLowerCase())
  );
  
  console.log('Found trip number headers:', tripNumberHeaders);
  
  // Parse each line into an object with enhanced validation
  const validOrders = lines.slice(1)
    .map((line, index) => {
      if (!line || line.trim() === '') {
        return null;
      }
      
      const values = parseCSVLine(line);
      
      // First pass: extract all raw values into a row object
      const rawRow: Record<string, string> = {};
      headers.forEach((header, i) => {
        if (i < values.length && header) {
          rawRow[header.trim()] = values[i] || '';
        }
      });
      
      // Log trip number values for selected orders
      if ([16, 21, 22, 23].includes(index)) {
        const tripNumberValues: Record<string, string> = {};
        tripNumberHeaders.forEach(header => {
          tripNumberValues[header] = rawRow[header] || 'N/A';
        });
        console.log(`CSV Row ${index + 1} (order-${index + 1}): Trip Number values:`, tripNumberValues);
      }
      
      // Check if this is a noise row (all key fields are empty)
      const keyFields = [
        "Pickup Address 1", 
        "Delivery Address 1", 
        "Ex. Ready Time", 
        "Ex. Delivery Time",
        "Order Number", 
        "Order #",
        "Pickup Location",
        "Delivery Location"
      ];
      
      // Check if any key field has a value
      const hasKeyData = keyFields.some(field => {
        const matchingKey = Object.keys(rawRow).find(
          key => key.toLowerCase() === field.toLowerCase()
        );
        return matchingKey && rawRow[matchingKey]?.trim();
      });
      
      // If no key data is present, skip this row as noise
      if (!hasKeyData) {
        return null;
      }
      
      // Initialize missing fields array
      const missingFields: string[] = [];
      
      // Create object with default values for all fields
      const order: DeliveryOrder = {
        id: `order-${index + 1}`,
        missingAddress: false,
        missingFields: [],
      };
      
      // Handle address concatenation for delivery address
      const addressLine = rawRow["Delivery Address 1"] || rawRow["delivery address 1"] || "";
      const city = rawRow["Delivery City"] || rawRow["delivery city"] || "";
      const state = rawRow["Delivery State"] || rawRow["delivery state"] || "";
      const zip = rawRow["Delivery Zip"] || rawRow["delivery zip"] || "";
      
      const fullAddress = [addressLine, city, state, zip]
        .filter(Boolean)
        .join(", ");
      
      // If we have a full address, set the dropoff to the full address
      if (fullAddress.trim() !== "") {
        order.dropoff = fullAddress;
      } else if (columnsExist.dropoff) {
        order.missingAddress = true;
        missingFields.push('address');
      }
      
      // Check for pickup location - specifically looking for "Pickup Address 1"
      const pickupAddress = 
        rawRow["Pickup Address 1"] || 
        rawRow["Pickup Location"] || 
        rawRow["Pickup Address"] || 
        rawRow["Pickup"] || 
        rawRow["pickup"] || 
        rawRow["pickup location"] || 
        rawRow["pickup address"] || 
        "";
      
      if (pickupAddress) {
        order.pickup = pickupAddress;
      } else if (columnsExist.pickup) {
        missingFields.push('pickupLocation');
      }
      
      // Handle time fields - using exact column names as specified
      const exReadyTime = rawRow["Ex. Ready Time"] || "";
      const exDeliveryTime = rawRow["Ex. Delivery Time"] || "";
      const actualPickupTime = rawRow["Actual Pickup Time"] || "";
      const actualDeliveryTime = rawRow["Actual Delivery Time"] || "";
      
      // Assign time values if present
      if (exReadyTime) {
        order.exReadyTime = exReadyTime;
        order.timeWindowStart = exReadyTime; // For backward compatibility
      } else if (columnsExist.exReadyTime) {
        missingFields.push('exReadyTime');
      }
      
      if (exDeliveryTime) {
        order.exDeliveryTime = exDeliveryTime;
        order.timeWindowEnd = exDeliveryTime; // For backward compatibility
      } else if (columnsExist.exDeliveryTime) {
        missingFields.push('exDeliveryTime');
      }
      
      if (actualPickupTime) {
        order.actualPickupTime = actualPickupTime;
      } else if (columnsExist.actualPickupTime) {
        missingFields.push('actualPickupTime');
      }
      
      if (actualDeliveryTime) {
        order.actualDeliveryTime = actualDeliveryTime;
      } else if (columnsExist.actualDeliveryTime) {
        missingFields.push('actualDeliveryTime');
      }
      
      // Check for items ONLY if the column exists in the CSV
      if (columnsExist.items) {
        const items = 
          rawRow["Items"] || 
          rawRow["Items Description"] || 
          rawRow["Item Description"] || 
          rawRow["Product"] || 
          rawRow["Products"] || 
          rawRow["items"] || 
          "";
        
        if (items) {
          order.items = items;
        } else {
          missingFields.push('items');
        }
      }
      
      // Check for distance field ONLY if the column exists
      if (columnsExist.distance) {
        const distanceStr = 
          rawRow["Distance"] || 
          rawRow["Miles"] || 
          rawRow["Mileage"] || 
          rawRow["Total Distance"] || 
          "";
        
        if (distanceStr) {
          // Try to parse as number, removing any non-numeric chars except decimal point
          const distanceValue = parseFloat(distanceStr.replace(/[^\d.]/g, ''));
          if (!isNaN(distanceValue)) {
            order.distance = distanceValue;
          }
        }
      }
      
      // Notes field
      const notes = 
        rawRow["Notes"] || 
        rawRow["Special Instructions"] || 
        rawRow["Instructions"] || 
        rawRow["notes"] || 
        "";
      
      if (notes) {
        order.notes = notes;
      } else if (columnsExist.notes) {
        missingFields.push('notes');
      }
      
      // Enhanced Trip Number extraction with unified approach
      const tripNumberValue = extractTripNumber(rawRow, index);
      
      if (tripNumberValue) {
        order.tripNumber = tripNumberValue;
        // Log for debugging specific orders
        if ([16, 21, 22, 23].includes(index)) {
          console.log(`Order ${index + 1} (order-${index + 1}): Found Trip Number "${tripNumberValue}" from column`);
        }
      } else if (columnsExist.tripNumber) {
        // Only add to missingFields if the column exists but no value was found
        // Leave order.tripNumber as undefined to be handled by normalization later
        missingFields.push('tripNumber');
        if ([16, 21, 22, 23].includes(index)) {
          console.log(`Order ${index + 1} (order-${index + 1}): No Trip Number found despite column existing`);
        }
      }
      
      // Enhanced Driver extraction with unified approach
      const driverValue = extractDriverName(rawRow);
      
      if (driverValue) {
        order.driver = driverValue;
      } else if (columnsExist.driver) {
        // Only set as undefined (not 'Unassigned') if driver column exists but is empty
        // This allows downstream normalization to handle it consistently
        missingFields.push('driver');
      }
      
      // Set the missing fields in the order
      order.missingFields = missingFields;
      
      // Check for order type indicators (pump pickup, delivery, etc.)
      const orderTypeField = 
        rawRow["Order Type"] || 
        rawRow["Type"] || 
        rawRow["Service Type"] || 
        "";
      
      if (orderTypeField) {
        order.orderType = orderTypeField.trim();
        
        // Check if this is a pump pickup order based on order type
        if (orderTypeField.trim().toLowerCase().includes("pump") || 
            orderTypeField.trim().toLowerCase().includes("pickup only")) {
          order.isPumpPickup = true;
        }
      }
      
      // Additional detection for pump pickup orders via notes or items fields
      const pumpKeywords = ['pump pickup', 'pump only', 'pickup pump', 'pump return'];
      
      // Check notes field for pump pickup indicators
      if (order.notes && pumpKeywords.some(keyword => 
        order.notes?.toLowerCase().includes(keyword))) {
        order.isPumpPickup = true;
        if (!order.orderType) {
          order.orderType = "PUMP_ONLY";
        }
      }
      
      // Check items field for pump pickup indicators
      if (order.items && pumpKeywords.some(keyword => 
        order.items?.toLowerCase().includes(keyword))) {
        order.isPumpPickup = true;
        if (!order.orderType) {
          order.orderType = "PUMP_ONLY";
        }
      }
      
      return order;
    })
    .filter(Boolean); // Filter out any null values (skipped noise rows)
  
  // Re-number the order IDs sequentially after filtering
  return validOrders.map((order, index) => ({
    ...order,
    id: `order-${index + 1}`
  }));
};

/**
 * Extract trip number from raw row data with comprehensive matching
 * Now ensures consistent handling of missing trip numbers as null
 */
function extractTripNumber(rawRow: Record<string, string>, rowIndex: number): string | null {
  // All possible trip number field variations
  const tripNumberVariations = [
    "Trip Number", "Trip #", "TripNumber", "Trip", 
    "Route Number", "Route #", "Route", 
    "trip number", "trip #", "tripnumber", "trip",
    "route number", "route #", "route", 
    "Trip", "TRIP", "Route", "ROUTE",
  ];
  
  // Try each variation until we find a non-empty value
  for (const fieldName of tripNumberVariations) {
    const value = rawRow[fieldName];
    
    // Skip empty or undefined values
    if (!value || value.trim() === '') continue;
    
    // Log found trip number for specific test orders
    if ([16, 21, 22, 23].includes(rowIndex)) {
      console.log(`Found trip number in "${fieldName}" column for order-${rowIndex+1}: "${value}"`);
    }
    
    return value.trim();
  }
  
  // Log for specific test orders if no trip number found
  if ([16, 21, 22, 23].includes(rowIndex)) {
    console.log(`No trip number found in any column for order-${rowIndex+1}`);
  }
  
  // Return null to explicitly indicate missing value - NOT an empty string or object
  return null;
}

/**
 * Extract driver name from raw row data with comprehensive matching
 * Now ensures consistent handling of missing drivers as null
 */
function extractDriverName(rawRow: Record<string, string>): string | null {
  // All possible driver field variations
  const driverVariations = [
    "Driver", "Driver Name", "Courier", 
    "driver", "driver name", "courier",
    "DRIVER", "DRIVER NAME", "COURIER"
  ];
  
  // Try each variation until we find a non-empty value
  for (const fieldName of driverVariations) {
    const value = rawRow[fieldName];
    
    // Skip empty or undefined values
    if (!value || value.trim() === '') continue;
    
    // Important: Return the raw value, do NOT convert to "Unassigned" here
    return value.trim();
  }
  
  // Return null to explicitly indicate missing value - NOT "Unassigned"
  return null;
}

// Helper function to parse CSV line correctly handling quotes
const parseCSVLine = (line: string): string[] => {
  if (!line) return [];
  
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  return result;
};

// Enhanced mapping function to ensure consistent field extraction
const mapHeaderToProperty = (header: string): keyof DeliveryOrder | null => {
  if (!header) return null;
  
  const headerMap: Record<string, keyof DeliveryOrder> = {
    'order id': 'id',
    'driver': 'driver',
    'driver name': 'driver',
    'courier': 'driver', // Added courier mapping
    'pickup': 'pickup',
    'pickup address': 'pickup',
    'pickup location': 'pickup',
    'pickup address 1': 'pickup',
    'dropoff': 'dropoff',
    'delivery address': 'dropoff',
    'dropoff address': 'dropoff',
    'destination': 'dropoff',
    'delivery address 1': 'dropoff',
    'time window start': 'timeWindowStart',
    'start time': 'timeWindowStart',
    'ex. ready time': 'exReadyTime',
    'time window end': 'timeWindowEnd',
    'end time': 'timeWindowEnd',
    'ex. delivery time': 'exDeliveryTime',
    'actual pickup time': 'actualPickupTime',
    'actual delivery time': 'actualDeliveryTime',
    'items': 'items',
    'items description': 'items',
    'item description': 'items',
    'product': 'items',
    'products': 'items',
    'notes': 'notes',
    'special instructions': 'notes',
    'instructions': 'notes',
    'trip number': 'tripNumber',
    'trip #': 'tripNumber',
    'tripnumber': 'tripNumber',
    'trip': 'tripNumber',
    'route number': 'tripNumber',
    'route #': 'tripNumber',
    'route': 'tripNumber',
  };
  
  const normalizedHeader = header.toLowerCase().trim();
  return headerMap[normalizedHeader] || null;
};
