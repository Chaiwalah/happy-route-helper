
export type DeliveryOrder = {
  id: string;
  driver?: string;
  pickup?: string;
  dropoff?: string;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  exReadyTime?: string;      // Expected pickup time
  exDeliveryTime?: string;   // Expected delivery time
  actualPickupTime?: string; // Actual pickup time
  actualDeliveryTime?: string; // Actual delivery time
  items?: string;
  notes?: string;
  estimatedDistance?: number;
  missingAddress?: boolean;  // Keeping for backward compatibility
  missingFields: string[];   // Array to track all missing fields
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
  const validOrders = lines.slice(1)
    .map((line, index) => {
      if (!line || line.trim() === '') {
        // Skip empty lines
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
        // Look for the field in case-insensitive way
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
        id: `order-${index + 1}`, // Add a default ID (will be re-numbered later)
        missingAddress: false, // Default to false, will set to true if address is missing
        missingFields: [], // Initialize empty array
      };
      
      // If we have a full address, set the dropoff to the full address
      if (fullAddress.trim() !== "") {
        order.dropoff = fullAddress;
      } else {
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
      } else {
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
      } else {
        missingFields.push('exReadyTime');
      }
      
      if (exDeliveryTime) {
        order.exDeliveryTime = exDeliveryTime;
        order.timeWindowEnd = exDeliveryTime; // For backward compatibility
      } else {
        missingFields.push('exDeliveryTime');
      }
      
      if (actualPickupTime) {
        order.actualPickupTime = actualPickupTime;
      } else {
        missingFields.push('actualPickupTime');
      }
      
      if (actualDeliveryTime) {
        order.actualDeliveryTime = actualDeliveryTime;
      } else {
        missingFields.push('actualDeliveryTime');
      }
      
      // Check for items
      const items = 
        rawRow["Items"] || 
        rawRow["Items Description"] || 
        rawRow["Product"] || 
        rawRow["Products"] || 
        rawRow["items"] || 
        "";
      
      if (items) {
        order.items = items;
      } else {
        missingFields.push('items');
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
      }
      
      // Check for driver
      const driver = 
        rawRow["Driver"] || 
        rawRow["Driver Name"] || 
        rawRow["Courier"] || 
        rawRow["driver"] || 
        "";
        
      if (driver) {
        order.driver = driver;
      }
      
      // Set the missing fields in the order
      order.missingFields = missingFields;
      
      // Add a random estimated distance if not provided (and if we have any location data)
      if ((order.pickup || order.dropoff) && !order.estimatedDistance) {
        // Generate a random distance between 1 and 20 miles
        order.estimatedDistance = Math.round((1 + Math.random() * 19) * 10) / 10;
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
    'product': 'items',
    'products': 'items',
    'notes': 'notes',
    'special instructions': 'notes',
    'instructions': 'notes',
  };
  
  const normalizedHeader = header.toLowerCase().trim();
  return headerMap[normalizedHeader] || null;
};
