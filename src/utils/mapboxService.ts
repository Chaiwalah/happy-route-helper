
// Mapbox service for geocoding and directions
const MAPBOX_TOKEN = 'pk.eyJ1IjoiY2hhaXdhbGFoMTUiLCJhIjoiY204amttc2VwMHB5cTJrcHQ5bDNqMzNydyJ9.d7DXZyPhDbGUJMNt13tmTw';

// Cache for geocoded addresses to avoid duplicate API calls
type GeocodingCache = {
  [address: string]: {
    longitude: number;
    latitude: number;
  } | null;
};

const geocodingCache: GeocodingCache = {};

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
  
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_TOKEN}`
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
      return null;
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
    geocodingCache[address] = null;
    return null;
  }
};

// Calculate route distance between multiple stops
export const calculateRouteDistance = async (addresses: string[]): Promise<number | null> => {
  if (!addresses || addresses.length < 2) {
    console.warn('Need at least two addresses to calculate a route');
    return null;
  }
  
  // First geocode all addresses
  const geocodingPromises = addresses.map(address => geocodeAddress(address));
  const coordinates = await Promise.all(geocodingPromises);
  
  // Check if any geocoding failed
  if (coordinates.some(coord => coord === null)) {
    console.warn('One or more addresses could not be geocoded');
    return null;
  }
  
  try {
    // Format coordinates for Mapbox Directions API
    const coordsString = coordinates
      .filter((coord): coord is {longitude: number, latitude: number} => coord !== null)
      .map(coord => `${coord.longitude},${coord.latitude}`)
      .join(';');
    
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?overview=full&geometries=geojson&access_token=${MAPBOX_TOKEN}`
    );
    
    if (!response.ok) {
      throw new Error(`Directions API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      // Convert meters to miles (1 meter = 0.000621371 miles)
      const distanceInMiles = data.routes[0].distance * 0.000621371;
      return distanceInMiles;
    } else {
      console.warn('No route found between the provided addresses');
      return null;
    }
  } catch (error) {
    console.error('Error calculating route distance:', error);
    return null;
  }
};

// Convert meters to miles
export const metersToMiles = (meters: number): number => {
  return meters / 1609.34;
};
