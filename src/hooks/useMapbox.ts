import { useState, useEffect, useCallback, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { debounce } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { DeliveryOrder } from '@/utils/csvParser';
import { geocodeAddress, getDriverColor, Coordinates } from '@/utils/mapboxService';

export interface MapLocation {
  id: string;
  orderId: string;
  type: 'pickup' | 'dropoff';
  address: string;
  driver: string;
  latitude: number;
  longitude: number;
  time?: string;
  coordinates: [number, number]; // [longitude, latitude] for Mapbox
  tripNumber?: string;
  distance?: number;
}

export interface DriverRoute {
  driver: string;
  date: string;
  color: string;
  stops: MapLocation[];
  totalDistance: number;
}

export const useMapbox = (orders: DeliveryOrder[], showRoutes: boolean, selectedDriver: string | null, selectedDate: string | null) => {
  // Refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const routeSourcesRef = useRef<string[]>([]);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  
  // State
  const [mapLocations, setMapLocations] = useState<MapLocation[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string>(
    localStorage.getItem('mapbox_token') || ''
  );
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [missingAddressCount, setMissingAddressCount] = useState(0);
  const [driverRoutes, setDriverRoutes] = useState<DriverRoute[]>([]);
  const [mapLoadError, setMapLoadError] = useState(false);
  
  // Add a custom marker to the map
  const addMarker = useCallback((location: MapLocation, color: string, index: number, isFirst: boolean) => {
    if (!map.current) return;
    
    // Create a marker element
    const el = document.createElement('div');
    el.className = 'custom-marker';
    el.style.backgroundColor = location.type === 'pickup' ? '#3b82f6' : color;
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.borderRadius = '50%';
    el.style.border = '2px solid white';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.color = 'white';
    el.style.fontWeight = 'bold';
    el.style.fontSize = '12px';
    
    // Add number to marker
    el.textContent = `${index + 1}`;
    
    // Create popup content
    const popupContent = document.createElement('div');
    popupContent.innerHTML = `
      <div class="p-2">
        <div class="font-medium text-sm">${location.driver}</div>
        <div class="text-xs text-gray-600">${location.type === 'pickup' ? 'Pickup' : 'Dropoff'} (Stop #${index + 1})</div>
        <div class="text-sm mt-1">${location.address}</div>
        ${location.time ? `<div class="flex items-center gap-1 text-gray-700 mt-1"><span class="text-xs">⏱</span> ${location.time}</div>` : ''}
        ${location.tripNumber ? `<div class="flex items-center gap-1 text-gray-700 mt-1"><span class="text-xs">🚚</span> Trip: ${location.tripNumber}</div>` : ''}
        ${location.distance ? `<div class="flex items-center gap-1 text-gray-700 mt-1"><span class="text-xs">📏</span> Distance: ${location.distance} mi</div>` : ''}
        <div class="text-xs text-gray-500 mt-1">Order ID: ${location.orderId}</div>
      </div>
    `;
    
    // Create popup
    const popup = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '300px'
    }).setDOMContent(popupContent);
    
    // Create and add the marker
    const marker = new mapboxgl.Marker({
      element: el,
    })
    .setLngLat([location.longitude, location.latitude])
    .setPopup(popup)
    .addTo(map.current);
    
    // Store the marker for later removal
    markersRef.current.push(marker);
  }, []);

  // Clear all markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
  }, []);

  // Clear existing route layers
  const clearRouteLayers = useCallback(() => {
    if (!map.current) return;
    
    // Remove existing route sources and layers
    routeSourcesRef.current.forEach(sourceId => {
      if (map.current?.getLayer(`${sourceId}-line`)) {
        map.current.removeLayer(`${sourceId}-line`);
      }
      
      if (map.current?.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    });
    
    routeSourcesRef.current = [];
  }, []);

  // Draw a route on the map
  const drawRoute = useCallback(async (driver: string, date: string, coordinates: [number, number][], color: string, index: number) => {
    if (!map.current || !mapboxToken) return;
    
    try {
      // Get route from Mapbox Directions API
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates.map(coord => coord.join(',')).join(';')}?geometries=geojson&overview=full&access_token=${mapboxToken}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to get directions: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.routes || data.routes.length === 0) {
        console.warn('No route found between coordinates');
        return;
      }
      
      const route = data.routes[0];
      const sourceId = `route-${driver}-${date}-${index}`;
      
      // Add route to map
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {
            driver,
            date
          },
          geometry: route.geometry
        }
      });
      
      map.current.addLayer({
        id: `${sourceId}-line`,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': color,
          'line-width': 4,
          'line-opacity': 0.8
        }
      });
      
      // Track the source ID for later cleanup
      routeSourcesRef.current.push(sourceId);
    } catch (error) {
      console.error('Error drawing route:', error);
    }
  }, [mapboxToken]);
  
  // Update map markers
  const updateMapMarkers = useCallback((locations: MapLocation[]) => {
    if (!map.current) return;
    
    console.log('Updating map with', locations.length, 'locations');
    
    // Create GeoJSON data from our locations
    const geojsonData = {
      type: 'FeatureCollection',
      features: locations.map(location => ({
        type: 'Feature',
        properties: {
          id: location.id,
          orderId: location.orderId,
          type: location.type,
          address: location.address,
          driver: location.driver,
          time: location.time,
          tripNumber: location.tripNumber,
          distance: location.distance
        },
        geometry: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        }
      }))
    };
    
    // Update the source data
    if (map.current.getSource('orders')) {
      (map.current.getSource('orders') as mapboxgl.GeoJSONSource).setData(geojsonData as any);
    }
    
    // Fit map to show all markers if we have any
    if (locations.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      
      locations.forEach(location => {
        bounds.extend([location.longitude, location.latitude]);
      });
      
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 13
      });
    }
  }, []);

  // Create and display driver routes
  const createDriverRoutes = useCallback((locations: MapLocation[]) => {
    if (!map.current || locations.length === 0) return;
    
    // Clear existing markers
    clearMarkers();
    
    // Group locations by driver and date
    const locationsByDriverAndDate = new Map<string, MapLocation[]>();
    
    locations.forEach(location => {
      // Skip locations without a driver
      if (!location.driver || location.driver === 'Unassigned') return;
      
      // Get date from the order
      const orderWithDate = orders.find(order => order.id === location.orderId);
      const orderDate = orderWithDate?.date || 
                        (orderWithDate?.exReadyTime ? orderWithDate.exReadyTime.split('T')[0] : null) ||
                        (orderWithDate?.exDeliveryTime ? orderWithDate.exDeliveryTime.split('T')[0] : null);
      
      if (!orderDate) return;
      
      // Use just the date part
      const date = orderDate.split('T')[0];
      
      // Skip if filtered by date and doesn't match
      if (selectedDate && date !== selectedDate) return;
      
      // Skip if filtered by driver and doesn't match
      if (selectedDriver && location.driver !== selectedDriver) return;
      
      const key = `${location.driver}_${date}`;
      
      if (!locationsByDriverAndDate.has(key)) {
        locationsByDriverAndDate.set(key, []);
      }
      
      locationsByDriverAndDate.get(key)?.push(location);
    });
    
    // Sort locations by time (if available)
    for (const [key, locs] of locationsByDriverAndDate.entries()) {
      // Sort first by type (pickup before dropoff), then by time if available
      locationsByDriverAndDate.set(key, locs.sort((a, b) => {
        // Put pickups first
        if (a.type === 'pickup' && b.type === 'dropoff') return -1;
        if (a.type === 'dropoff' && b.type === 'pickup') return 1;
        
        // Then sort by time if available
        if (a.time && b.time) {
          return new Date(a.time).getTime() - new Date(b.time).getTime();
        }
        
        // If no time, keep original order
        return 0;
      }));
    }
    
    // Create driver routes
    const routes: DriverRoute[] = [];
    
    for (const [key, locs] of locationsByDriverAndDate.entries()) {
      const [driver, date] = key.split('_');
      
      // Get a consistent color for this driver
      const color = getDriverColor(driver);
      
      // Calculate total distance for this route
      const totalDistance = locs.reduce((sum, loc) => {
        return sum + (loc.distance || 0);
      }, 0);
      
      routes.push({
        driver,
        date,
        color,
        stops: locs,
        totalDistance: parseFloat(totalDistance.toFixed(1))
      });
    }
    
    setDriverRoutes(routes);
    
    // Clear previous route layers
    clearRouteLayers();
    
    // Draw each route
    routes.forEach((route, index) => {
      if (route.stops.length < 2) return; // Need at least 2 points for a route
      
      const coordinatesList = route.stops.map(stop => stop.coordinates);
      drawRoute(route.driver, route.date, coordinatesList, route.color, index);
      
      // Add markers for each stop in the route
      route.stops.forEach((stop, stopIndex) => {
        addMarker(stop, route.color, stopIndex, stopIndex === 0);
      });
    });
    
    // Fit map to show all markers if we have any
    if (markersRef.current.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      
      markersRef.current.forEach(marker => {
        bounds.extend(marker.getLngLat());
      });
      
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 13
      });
    }
  }, [orders, selectedDriver, selectedDate, clearMarkers, clearRouteLayers, drawRoute, addMarker]);

  // Geocode addresses
  const geocodeAddresses = useCallback(() => {
    if (!map.current || !isMapInitialized || orders.length === 0) {
      console.log('Cannot geocode addresses: map not ready or no orders');
      return;
    }
    
    console.log('Starting geocoding for', orders.length, 'orders');
    setIsLoading(true);
    
    // Count orders with missing addresses
    const missingCount = orders.filter(order => order.missingAddress === true).length;
    setMissingAddressCount(missingCount);
    
    // Filter orders with valid addresses
    const validOrders = orders.filter(order => order.missingAddress !== true);
    
    processBatch(
      validOrders,
      (locations) => {
        console.log('Geocoded', locations.length, 'locations');
        setMapLocations(locations);
        updateMapMarkers(locations);
        
        if (showRoutes) {
          createDriverRoutes(locations);
        }
        
        setIsLoading(false);
        
        if (missingCount > 0) {
          const validCount = orders.length - missingCount;
          toast({
            description: `Geocoded locations for ${validCount} orders. ${missingCount} order${missingCount !== 1 ? 's' : ''} had missing address data.`,
            variant: "warning",
          });
        } else {
          toast({
            description: `Geocoded locations for all ${orders.length} orders`,
          });
        }
      },
      (processed, total) => {
        console.log(`Geocoding progress: ${processed}/${total}`);
      }
    );
  }, [orders, showRoutes, isMapInitialized, updateMapMarkers, createDriverRoutes]);

  // Process batches to avoid UI freezing
  const processBatch = async (
    batch: DeliveryOrder[], 
    onResult: (locations: MapLocation[]) => void,
    onProgress: (processed: number, total: number) => void
  ) => {
    const batchLocations: MapLocation[] = [];
    const batchSize = 5; // Process 5 orders at a time
    
    for (let i = 0; i < batch.length; i += batchSize) {
      const currentBatch = batch.slice(i, i + batchSize);
      const batchPromises: Promise<void>[] = [];
      
      for (const order of currentBatch) {
        if (order.missingAddress !== true) {
          if (order.pickup) {
            batchPromises.push(
              geocodeAddress(order.pickup).then(coords => {
                if (coords) {
                  batchLocations.push({
                    id: `pickup-${order.id || 'unknown'}`,
                    orderId: order.id || 'unknown',
                    type: 'pickup',
                    address: order.pickup,
                    driver: order.driver || 'Unassigned',
                    latitude: coords[1],
                    longitude: coords[0],
                    time: order.actualPickupTime || order.exReadyTime,
                    coordinates: coords,
                    tripNumber: order.tripNumber,
                    distance: order.estimatedDistance
                  });
                }
              })
            );
          }
          
          if (order.dropoff) {
            batchPromises.push(
              geocodeAddress(order.dropoff).then(coords => {
                if (coords) {
                  batchLocations.push({
                    id: `dropoff-${order.id || 'unknown'}`,
                    orderId: order.id || 'unknown',
                    type: 'dropoff',
                    address: order.dropoff,
                    driver: order.driver || 'Unassigned',
                    latitude: coords[1],
                    longitude: coords[0],
                    time: order.actualDeliveryTime || order.exDeliveryTime,
                    coordinates: coords,
                    tripNumber: order.tripNumber,
                    distance: order.estimatedDistance
                  });
                }
              })
            );
          }
        }
      }
      
      await Promise.all(batchPromises);
      onProgress(Math.min(i + batchSize, batch.length), batch.length);
      
      // Allow UI to update between batches
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    onResult(batchLocations);
  };

  // Initialize map
  const initializeMap = useCallback(() => {
    if (!mapContainer.current || !mapboxToken) {
      console.error('Cannot initialize map: missing container or token');
      return;
    }
    
    try {
      console.log('Initializing map with token:', mapboxToken.substring(0, 10) + '...');
      
      // Clean up existing map if any
      if (map.current) {
        map.current.remove();
      }
      
      // Reset error state
      setMapLoadError(false);
      
      // Initialize Mapbox
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-97.7431, 30.2672], // Default to Austin, TX
        zoom: 9,
        maxZoom: 16,
        minZoom: 3,
        renderWorldCopies: false,
      });
      
      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      // Create popup
      popupRef.current = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        maxWidth: '300px'
      });
      
      map.current.on('load', () => {
        if (!map.current) return;
        
        console.log('Map loaded successfully');
        
        // Add a data source for our markers
        map.current.addSource('orders', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          },
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });
        
        // Add cluster circles
        map.current.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'orders',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#93c5fd', // Blue for small clusters
              10,
              '#3b82f6', // Darker blue for medium clusters
              30,
              '#1d4ed8'  // Even darker for large clusters
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20,  // Size for small clusters
              10,
              25,  // Size for medium clusters
              30,
              30   // Size for large clusters
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });
        
        // Add cluster count text
        map.current.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'orders',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12
          },
          paint: {
            'text-color': '#ffffff'
          }
        });
        
        // Add pickup markers layer
        map.current.addLayer({
          id: 'pickups',
          type: 'circle',
          source: 'orders',
          filter: ['all', ['!', ['has', 'point_count']], ['==', 'type', 'pickup']],
          paint: {
            'circle-radius': 8,
            'circle-color': '#3b82f6',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });
        
        // Add dropoff markers layer
        map.current.addLayer({
          id: 'dropoffs',
          type: 'circle',
          source: 'orders',
          filter: ['all', ['!', ['has', 'point_count']], ['==', 'type', 'dropoff']],
          paint: {
            'circle-radius': 8,
            'circle-color': '#ef4444',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });
        
        // Handle popup display for clusters
        map.current.on('click', 'clusters', (e) => {
          if (!map.current || !e.features || e.features.length === 0) return;
          
          const feature = e.features[0];
          const clusterId = feature.properties.cluster_id;
          const clusterSource = map.current.getSource('orders') as mapboxgl.GeoJSONSource;
          
          // Zoom in on cluster
          clusterSource.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err || !map.current) return;
            
            map.current.easeTo({
              center: (feature.geometry as any).coordinates,
              zoom: zoom
            });
          });
        });
        
        // Handle popup display for individual points
        for (const layerId of ['pickups', 'dropoffs']) {
          map.current.on('mouseenter', layerId, (e) => {
            if (!map.current || !popupRef.current || !e.features || e.features.length === 0) return;
            
            map.current.getCanvas().style.cursor = 'pointer';
            const feature = e.features[0];
            const coordinates = feature.geometry.coordinates.slice() as [number, number];
            
            // Format time if available
            let timeText = '';
            if (feature.properties.time) {
              timeText = `<div class="flex items-center gap-1 text-gray-700"><span class="text-xs">⏱</span> ${feature.properties.time}</div>`;
            } else {
              timeText = `<div class="flex items-center gap-1 text-gray-500"><span class="text-xs">⏱</span> No time data</div>`;
            }

            // Add trip number if available
            let tripNumberText = '';
            if (feature.properties.tripNumber) {
              tripNumberText = `<div class="flex items-center gap-1 text-gray-700"><span class="text-xs">🚚</span> Trip: ${feature.properties.tripNumber}</div>`;
            }

            // Add distance if available
            let distanceText = '';
            if (feature.properties.distance) {
              distanceText = `<div class="flex items-center gap-1 text-gray-700"><span class="text-xs">📏</span> Distance: ${feature.properties.distance} mi</div>`;
            }
            
            const description = `
              <div class="p-1">
                <div class="font-medium text-sm">${feature.properties.driver}</div>
                <div class="text-xs text-gray-600">${feature.properties.type === 'pickup' ? 'Pickup' : 'Dropoff'}</div>
                <div class="text-sm mt-1">${feature.properties.address}</div>
                ${timeText}
                ${tripNumberText}
                ${distanceText}
                <div class="text-xs text-gray-500 mt-1">Order ID: ${feature.properties.orderId}</div>
              </div>
            `;
            
            popupRef.current.setLngLat(coordinates).setHTML(description).addTo(map.current);
          });
          
          map.current.on('mouseleave', layerId, () => {
            if (!map.current || !popupRef.current) return;
            map.current.getCanvas().style.cursor = '';
            popupRef.current.remove();
          });
        }
        
        // Set cursor to pointer when hovering over clusters
        map.current.on('mouseenter', 'clusters', () => {
          if (!map.current) return;
          map.current.getCanvas().style.cursor = 'pointer';
        });
        
        map.current.on('mouseleave', 'clusters', () => {
          if (!map.current) return;
          map.current.getCanvas().style.cursor = '';
        });
        
        setIsMapInitialized(true);
        toast({
          description: "Map initialized successfully",
        });
        
        // Now geocode the addresses
        if (orders.length > 0) {
          geocodeAddresses();
        }
      });
      
      // Handle map load errors
      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setMapLoadError(true);
        toast({
          title: "Map error",
          description: "An error occurred while loading the map. Please check your Mapbox token.",
          variant: "destructive",
        });
      });
      
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapLoadError(true);
      toast({
        title: "Error initializing map",
        description: "Please check your Mapbox token and try again",
        variant: "destructive",
      });
    }
  }, [mapboxToken, orders, geocodeAddresses]);

  // Debounced token save to prevent excessive reinitialization
  const handleTokenSave = useCallback(debounce(() => {
    if (mapboxToken) {
      console.log('Saving token and initializing map');
      localStorage.setItem('mapbox_token', mapboxToken);
      initializeMap();
    } else {
      toast({
        title: "Mapbox token required",
        description: "Please enter a valid Mapbox token",
        variant: "destructive",
      });
    }
  }, 500), [mapboxToken, initializeMap]);

  // Initialize map when token is available
  useEffect(() => {
    if (mapboxToken && !isMapInitialized && !mapLoadError) {
      console.log('Initializing map on mount or token change');
      initializeMap();
    }
    
    return () => {
      // Cleanup on unmount
      if (map.current) {
        console.log('Cleaning up map on unmount');
        map.current.remove();
        map.current = null;
      }
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    };
  }, [mapboxToken, initializeMap, isMapInitialized, mapLoadError]);

  // Update markers when orders change and map is initialized
  useEffect(() => {
    if (isMapInitialized && orders.length > 0 && !isLoading) {
      console.log('Orders or filters changed, updating geocoding');
      geocodeAddresses();
    }
  }, [isMapInitialized, orders, selectedDriver, selectedDate, geocodeAddresses, isLoading]);

  return {
    mapContainer,
    mapboxToken,
    setMapboxToken,
    isMapInitialized,
    isLoading,
    missingAddressCount,
    driverRoutes,
    mapLocations,
    handleTokenSave,
    geocodeAddresses,
    mapLoadError
  };
};
