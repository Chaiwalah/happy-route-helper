
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
  // Split by new lines and remove empty lines
  const lines = content.split('\n').filter(line => line.trim() !== '');
  
  // Extract headers from first line
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Parse each line into an object
  return lines.slice(1).map((line, index) => {
    const values = parseCSVLine(line);
    
    // Create object mapping headers to values
    const order: Partial<DeliveryOrder> = {
      id: `order-${index + 1}` // Add a default ID in case it's not in the CSV
    };
    
    headers.forEach((header, i) => {
      if (i < values.length) {
        const key = mapHeaderToProperty(header);
        if (key) {
          (order as any)[key] = values[i];
        }
      }
    });
    
    return order as DeliveryOrder;
  });
};

// Helper function to parse CSV line correctly handling quotes
const parseCSVLine = (line: string): string[] => {
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
