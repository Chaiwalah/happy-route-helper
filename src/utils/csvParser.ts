export type DeliveryOrder = {
  id: string;
  driver?: string;
  pickup?: string;
  dropoff?: string;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  items?: string;
  notes?: string;
  estimatedDistance?: number;
  missingAddress?: boolean; // Keeping for backward compatibility
  missingFields: string[]; // New array to track all missing fields
};

export const parseCSV = (content: string): DeliveryOrder[] => {
  // Check for empty content
  if (!content || content.trim() === '') {
    return []; // Return empty array if no content
  }
  
  // Split by new lines and remove empty lines
  const lines = content.split('\n').filter(line => line && line.trim() !== '');
  
  if (lines.length === 0) {
    return []; // Return empty array if no valid lines
  }
  
  // Extract headers from first line
  const headers = lines[0].split(',').map(h => h?.trim() || '');
  
  if (headers.length === 0) {
    return []; // Return empty array if no headers
  }
  
  // Parse each line into an object
  return lines.slice(1).map((line, index) => {
    if (!line || line.trim() === '') {
      // Skip empty lines
      return {
        id: `order-${index + 1}`,
        missingAddress: true,
        missingFields: ['address'], // Initialize with address missing
      };
    }
    
    const values = parseCSVLine(line);
    
    // First pass: extract all raw values into a row object
    const rawRow: Record<string, string> = {};
    headers.forEach((header, i) => {
      if (i < values.length && header) {
        rawRow[header.trim()] = values[i] || '';
      }
    });
    
    // Initialize missing fields array
    const missingFields: string[] = [];
    
    // Handle address concatenation for delivery address
    const addressLine = rawRow["Delivery Address 1"] || rawRow["delivery address 1"] || "";
    const city = rawRow["Delivery City"] || rawRow["delivery city"] || "";
    const state = rawRow["Delivery State"] || rawRow["delivery state"] || "";
    const zip = rawRow["Delivery Zip"] || rawRow["delivery zip"] || "";
    
    const fullAddress = [addressLine, city, state, zip]
      .filter(Boolean)
      .join(", ");
    
    // Create object with default values for all fields
    const order: DeliveryOrder = {
      id: `order-${index + 1}`, // Add a default ID
      missingAddress: true, // Default to true, will set to false if we find address
      missingFields: [], // Initialize empty array
    };
    
    // If we have a full address, set the dropoff to the full address
    if (fullAddress.trim() !== "") {
      order.dropoff = fullAddress;
      order.missingAddress = false; // We have an address, so set to false
    } else {
      order.missingFields.push('address');
    }
    
    // Second pass: map all other fields normally
    headers.forEach((header, i) => {
      if (i < values.length && header) {
        const key = mapHeaderToProperty(header);
        if (key && key !== 'dropoff') { // Skip dropoff as we've already handled it
          (order as any)[key] = values[i] || '';
        }
      }
    });
    
    // Check for time window
    if (!order.timeWindowStart && !order.timeWindowEnd) {
      order.missingFields.push('timeWindow');
    }
    
    // Check for items field
    if (!order.items || order.items.trim() === '') {
      order.missingFields.push('items');
    }
    
    // Check for pickup field
    if (!order.pickup || order.pickup.trim() === '') {
      order.missingFields.push('pickup');
    }
    
    // Add a random estimated distance if not provided (and if we have any location data)
    if ((order.pickup || order.dropoff) && !order.estimatedDistance) {
      // Generate a random distance between 1 and 20 miles
      order.estimatedDistance = Math.round((1 + Math.random() * 19) * 10) / 10;
    }
    
    return order;
  }).filter(Boolean); // Filter out any undefined values
};

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

// Map CSV headers to our DeliveryOrder properties
const mapHeaderToProperty = (header: string): keyof DeliveryOrder | null => {
  if (!header) return null;
  
  const headerMap: Record<string, keyof DeliveryOrder> = {
    'order id': 'id',
    'driver': 'driver',
    'driver name': 'driver',
    'pickup': 'pickup',
    'pickup address': 'pickup',
    'pickup location': 'pickup',
    'dropoff': 'dropoff',
    'delivery address': 'dropoff',
    'dropoff address': 'dropoff',
    'destination': 'dropoff',
    'delivery address 1': 'dropoff', // Added for direct mapping if needed
    'time window start': 'timeWindowStart',
    'start time': 'timeWindowStart',
    'time window end': 'timeWindowEnd',
    'end time': 'timeWindowEnd',
    'items': 'items',
    'product': 'items',
    'products': 'items',
    'notes': 'notes',
    'special instructions': 'notes',
    'instructions': 'notes',
  };
  
  const normalizedHeader = header.toLowerCase().trim();
  return headerMap[normalizedHeader] || null;
};
