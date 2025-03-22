
// Mapbox service for geocoding and directions
const MAPBOX_TOKEN = 'pk.eyJ1IjoiY2hhaXdhbGFoMTUiLCJhIjoiY204amttc2VwMHB5cTJrcHQ5bDNqMzNydyJ9.d7DXZyPhDbGUJMNt13tmTw';

// Cache for geocoded addresses to avoid duplicate API calls
type GeocodingCache = {
  [address: string]: {
    longitude: number;
    latitude: number;
  } | null;
};

// Shared cache that persists during the session
const geocodingCache: GeocodingCache = {};

// Cache for route distances to avoid duplicate calculations
const routeDistanceCache: { [key: string]: number | null } = {};

// Track failed addresses to avoid repeated failures
const failedAddresses = new Set<string>();

// Convert an address string to coordinates
export const geocodeAddress = async (address: string): Promise<{longitude: number, latitude: number} | null> => {
  if (!address || address.trim() === '') {
    console.warn('Empty address provided for geocoding');
    return null;
  }
  
  // Check cache first
  if (geocodingCache[address] !== undefined) {
    return geocodingCache[address];
  }
  
  // Skip addresses that have repeatedly failed
  if (failedAddresses.has(address)) {
    console.warn(`Skipping previously failed address: ${address}`);
    return null;
  }
  
  try {
    console.log(`Geocoding address: ${address}`);
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_TOKEN}`,
      { signal: AbortSignal.timeout(8000) } // Add timeout to fetch to prevent hanging
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const coords = {
        longitude: data.features[0].center[0],
        latitude: data.features[0].center[1]
      };
      
      // Cache the result
      geocodingCache[address] = coords;
      return coords;
    } else {
      console.warn(`No geocoding results for address: ${address}`);
      geocodingCache[address] = null;
      failedAddresses.add(address); // Mark as failed
      return null;
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
    
    // Add to failed addresses if it's a persistent issue
    if (error instanceof Error && 
       (error.message.includes('timeout') || error.message.includes('network'))) {
      failedAddresses.add(address);
    }
    
    // Cache failures too (but as null)
    geocodingCache[address] = null;
    return null;
  }
};

// Generate a cache key for routes
const getRouteKey = (addresses: string[]): string => {
  return addresses.join('|');
};

// Calculate route distance between multiple stops
export const calculateRouteDistance = async (addresses: string[]): Promise<number | null> => {
  if (!addresses || addresses.length < 2) {
    console.warn('Need at least two addresses to calculate a route');
    return null;
  }
  
  // Generate a cache key for this route
  const routeKey = getRouteKey(addresses);
  
  // Check cache first
  if (routeDistanceCache[routeKey] !== undefined) {
    return routeDistanceCache[routeKey];
  }
  
  console.log(`Calculating distance between ${addresses.length} addresses`);
  
  // First geocode all addresses
  const geocodingPromises = addresses.map(address => geocodeAddress(address));
  const coordinates = await Promise.all(geocodingPromises);
  
  // Check if any geocoding failed
  if (coordinates.some(coord => coord === null)) {
    console.warn('One or more addresses could not be geocoded');
    routeDistanceCache[routeKey] = null; // Cache the failure
    return null;
  }
  
  try {
    // Format coordinates for Mapbox Directions API
    const coordsString = coordinates
      .filter((coord): coord is {longitude: number, latitude: number} => coord !== null)
      .map(coord => `${coord.longitude},${coord.latitude}`)
      .join(';');
    
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?overview=full&geometries=geojson&access_token=${MAPBOX_TOKEN}`,
      { signal: AbortSignal.timeout(8000) } // Add timeout
    );
    
    if (!response.ok) {
      throw new Error(`Directions API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      // Convert meters to miles (1 meter = 0.000621371 miles)
      const distanceInMiles = data.routes[0].distance * 0.000621371;
      
      // Cache the result
      routeDistanceCache[routeKey] = distanceInMiles;
      return distanceInMiles;
    } else {
      console.warn('No route found between the provided addresses');
      routeDistanceCache[routeKey] = null;
      return null;
    }
  } catch (error) {
    console.error('Error calculating route distance:', error);
    // Cache failed routes too
    routeDistanceCache[routeKey] = null;
    return null;
  }
};

// Convert meters to miles
export const metersToMiles = (meters: number): number => {
  return meters / 1609.34;
};

// Clear caches (useful for testing)
export const clearCaches = () => {
  for (const key in geocodingCache) delete geocodingCache[key];
  for (const key in routeDistanceCache) delete routeDistanceCache[key];
  failedAddresses.clear();
};
