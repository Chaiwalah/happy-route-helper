// Mapbox service for geocoding and directions
const MAPBOX_TOKEN = '';

// Coordinate type to ensure consistent usage
export type Coordinates = [number, number]; // [longitude, latitude]

// Cache for geocoded addresses to avoid duplicate API calls
type GeocodingCache = {
  [address: string]: Coordinates | null;
};

// Shared cache that persists during the session
const geocodingCache: GeocodingCache = {};

// Cache for route distances to avoid duplicate calculations
const routeDistanceCache: { [key: string]: number | null } = {};

// Cache for route geometries to avoid duplicate API calls
const routeGeometryCache: { [key: string]: any | null } = {};

// Track failed addresses to avoid repeated failures
const failedAddresses = new Set<string>();

// Throttle control for API requests - prevent too many at once
let pendingRequests = 0;
const MAX_CONCURRENT_REQUESTS = 3;
const REQUEST_QUEUE: Array<() => Promise<void>> = [];

// Helper to process the request queue
const processQueue = async () => {
  if (REQUEST_QUEUE.length === 0 || pendingRequests >= MAX_CONCURRENT_REQUESTS) return;
  
  pendingRequests++;
  const request = REQUEST_QUEUE.shift();
  if (request) {
    try {
      await request();
    } catch (error) {
      console.error('Error processing queued request:', error);
    } finally {
      pendingRequests--;
      // Process next request after a small delay
      setTimeout(processQueue, 50);
    }
  }
};

// Get the mapbox token (from localStorage)
export const getMapboxToken = (): string => {
  return localStorage.getItem('mapbox_token') || '';
};

// Convert an address string to coordinates
export const geocodeAddress = async (address: string): Promise<Coordinates | null> => {
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

  const token = getMapboxToken();
  if (!token) {
    console.error('No Mapbox token available for geocoding');
    return null;
  }
  
  // Create a promise that will be resolved when this request is processed
  return new Promise((resolve) => {
    const performRequest = async () => {
      try {
        console.log(`Geocoding address: ${address}`);
        const encodedAddress = encodeURIComponent(address);
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${token}`,
          { signal: AbortSignal.timeout(5000) }
        );
        
        if (!response.ok) {
          throw new Error(`Geocoding API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          // Create coordinates as a tuple [longitude, latitude]
          const coords: Coordinates = [
            data.features[0].center[0],
            data.features[0].center[1]
          ];
          
          // Cache the result
          geocodingCache[address] = coords;
          resolve(coords);
        } else {
          console.warn(`No geocoding results for address: ${address}`);
          geocodingCache[address] = null;
          failedAddresses.add(address); // Mark as failed
          resolve(null);
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
        resolve(null);
      } finally {
        // Process next request
        pendingRequests--;
        setTimeout(processQueue, 50);
      }
    };
    
    // Add to queue and process
    REQUEST_QUEUE.push(performRequest);
    processQueue();
  });
};

// Get a fixed color for a driver to ensure consistency
export const getDriverColor = (driverName: string): string => {
  // Hash the driver name to get a consistent value
  let hash = 0;
  for (let i = 0; i < driverName.length; i++) {
    hash = driverName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // List of distinct, visually pleasing colors
  const colors = [
    '#3498db', // blue
    '#2ecc71', // green
    '#e74c3c', // red
    '#9b59b6', // purple
    '#f1c40f', // yellow
    '#1abc9c', // teal
    '#d35400', // orange
    '#34495e', // dark blue
    '#16a085', // green blue
    '#c0392b', // dark red
    '#8e44ad', // dark purple
    '#f39c12', // dark yellow
    '#27ae60', // dark green
    '#2980b9', // dark blue
  ];
  
  // Use the hash to select a color
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Generate a cache key for routes
const getRouteKey = (coordinates: Coordinates[]): string => {
  return coordinates.map(coord => coord.join(',')).join('|');
};

// Get route geometry between multiple stops
export const getRouteGeometry = async (coordinates: Coordinates[]): Promise<any | null> => {
  if (!coordinates || coordinates.length < 2) {
    console.warn('Need at least two coordinates to calculate a route');
    return null;
  }
  
  // Generate a cache key for this route
  const routeKey = getRouteKey(coordinates);
  
  // Check cache first
  if (routeGeometryCache[routeKey] !== undefined) {
    return routeGeometryCache[routeKey];
  }
  
  console.log(`Getting route geometry between ${coordinates.length} coordinates`);
  
  const token = getMapboxToken();
  if (!token) {
    console.error('No Mapbox token available for route geometry');
    return null;
  }
  
  // Create a promise that will be resolved when this request is processed
  return new Promise((resolve) => {
    const performRequest = async () => {
      try {
        // Format coordinates for Mapbox Directions API
        const coordsString = coordinates
          .map(coord => `${coord[0]},${coord[1]}`)
          .join(';');
        
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=geojson&overview=full&access_token=${token}`,
          { signal: AbortSignal.timeout(5000) }
        );
        
        if (!response.ok) {
          throw new Error(`Directions API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          // Cache the geometry
          routeGeometryCache[routeKey] = data.routes[0].geometry;
          resolve(data.routes[0].geometry);
        } else {
          console.warn('No route found between the provided coordinates');
          routeGeometryCache[routeKey] = null;
          resolve(null);
        }
      } catch (error) {
        console.error('Error getting route geometry:', error);
        // Cache failed routes too
        routeGeometryCache[routeKey] = null;
        resolve(null);
      } finally {
        // Process next request
        pendingRequests--;
        setTimeout(processQueue, 50);
      }
    };
    
    // Add to queue and process
    REQUEST_QUEUE.push(performRequest);
    processQueue();
  });
};

// Calculate route distance between multiple stops
export const calculateRouteDistance = async (coordinates: Coordinates[]): Promise<number | null> => {
  if (!coordinates || coordinates.length < 2) {
    console.warn('Need at least two coordinates to calculate a route');
    return null;
  }
  
  // Generate a cache key for this route
  const routeKey = getRouteKey(coordinates);
  
  // Check cache first
  if (routeDistanceCache[routeKey] !== undefined) {
    return routeDistanceCache[routeKey];
  }
  
  const token = getMapboxToken();
  if (!token) {
    console.error('No Mapbox token available for route distance');
    return null;
  }
  
  // If this is a multi-stop route (more than 2 coordinates), 
  // estimate the distance as a sum of pairs to avoid expensive API calls
  if (coordinates.length > 2) {
    console.log(`Using distance estimation for ${coordinates.length} coordinates`);
    try {
      let totalDistance = 0;
      // Calculate distances between consecutive pairs
      for (let i = 0; i < coordinates.length - 1; i++) {
        const pairDistance = await calculateRouteDistance([coordinates[i], coordinates[i+1]]);
        if (pairDistance === null) {
          // If any segment fails, return null;
          return null;
        }
        totalDistance += pairDistance;
      }
      // Apply a small reduction factor for multi-stop routes (since direct routes are usually more efficient)
      const estimatedDistance = totalDistance * 0.9;
      routeDistanceCache[routeKey] = estimatedDistance;
      return estimatedDistance;
    } catch (error) {
      console.error('Error in multi-stop estimation:', error);
      return null;
    }
  }
  
  console.log(`Calculating distance between ${coordinates.length} coordinates`);
  
  // Create a promise that will be resolved when this request is processed
  return new Promise((resolve) => {
    const performRequest = async () => {
      try {
        // Format coordinates for Mapbox Directions API
        const coordsString = coordinates
          .map(coord => `${coord[0]},${coord[1]}`)
          .join(';');
        
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?overview=full&geometries=geojson&access_token=${token}`,
          { signal: AbortSignal.timeout(5000) }
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
          
          // Also cache the geometry for future use
          routeGeometryCache[routeKey] = data.routes[0].geometry;
          
          resolve(distanceInMiles);
        } else {
          console.warn('No route found between the provided coordinates');
          routeDistanceCache[routeKey] = null;
          routeGeometryCache[routeKey] = null;
          resolve(null);
        }
      } catch (error) {
        console.error('Error calculating route distance:', error);
        // Cache failed routes too
        routeDistanceCache[routeKey] = null;
        routeGeometryCache[routeKey] = null;
        resolve(null);
      } finally {
        // Process next request
        pendingRequests--;
        setTimeout(processQueue, 50);
      }
    };
    
    // Add to queue and process
    REQUEST_QUEUE.push(performRequest);
    processQueue();
  });
};

// Convert meters to miles
export const metersToMiles = (meters: number): number => {
  return meters / 1609.34;
};

// Clear caches (useful for testing)
export const clearCaches = () => {
  for (const key in geocodingCache) delete geocodingCache[key];
  for (const key in routeDistanceCache) delete routeDistanceCache[key];
  for (const key in routeGeometryCache) delete routeGeometryCache[key];
  failedAddresses.clear();
};
