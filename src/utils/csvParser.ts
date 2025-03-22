
export type DeliveryOrder = {
  id: string;
  driver: string;
  pickup: string;
  dropoff: string;
  timeWindowStart: string;
  timeWindowEnd: string;
  items: string;
  notes: string;
  estimatedDistance?: number;
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
        driver: '',
        pickup: '',
        dropoff: '',
        timeWindowStart: '',
        timeWindowEnd: '',
        items: '',
        notes: ''
      };
    }
    
    const values = parseCSVLine(line);
    
    // Create object with default values for all fields
    const order: DeliveryOrder = {
      id: `order-${index + 1}`, // Add a default ID
      driver: '',
      pickup: '',
      dropoff: '',
      timeWindowStart: '',
      timeWindowEnd: '',
      items: '',
      notes: ''
    };
    
    headers.forEach((header, i) => {
      if (i < values.length && header) {
        const key = mapHeaderToProperty(header);
        if (key) {
          (order as any)[key] = values[i] || '';
        }
      }
    });
    
    // Add a random estimated distance if not provided (and if we have pickup/dropoff data)
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
