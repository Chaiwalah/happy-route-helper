
"use client"

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { DeliveryOrder } from '@/utils/csvParser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, AlertCircle, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { debounce } from '@/lib/utils';

interface OrderMapProps {
  orders: DeliveryOrder[];
}

interface MapLocation {
  id: string;
  type: 'pickup' | 'dropoff';
  address: string;
  driver: string;
  latitude: number;
  longitude: number;
}

const OrderMap = ({ orders }: OrderMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>(localStorage.getItem('mapbox_token') || '');
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const mapLocations = useRef<MapLocation[]>([]);
  const [missingAddressCount, setMissingAddressCount] = useState(0);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  
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
                    id: order.id || 'unknown',
                    type: 'pickup',
                    address: order.pickup,
                    driver: order.driver || 'Unassigned',
                    latitude: coords.latitude,
                    longitude: coords.longitude
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
                    id: order.id || 'unknown',
                    type: 'dropoff',
                    address: order.dropoff,
                    driver: order.driver || 'Unassigned',
                    latitude: coords.latitude,
                    longitude: coords.longitude
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

  const geocodeAddress = async (address: string) => {
    if (!address) return null;
    
    try {
      // Simulate geocoding by extracting lat/lng from previous data
      // This is a placeholder - in a real app, you'd use the Mapbox geocoding API
      const cachedResponse = localStorage.getItem(`geocode_${address}`);
      if (cachedResponse) {
        return JSON.parse(cachedResponse);
      }
      
      // Geocode the address using Mapbox Geocoding API
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&limit=1`
      );
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const result = {
          longitude: data.features[0].center[0],
          latitude: data.features[0].center[1]
        };
        
        // Cache the result
        localStorage.setItem(`geocode_${address}`, JSON.stringify(result));
        return result;
      }
      
      return null;
    } catch (error) {
      console.error('Error geocoding address:', address, error);
      return null;
    }
  };

  const initializeMap = useCallback(() => {
    if (!mapContainer.current || !mapboxToken) return;
    
    try {
      // Clean up existing map if any
      if (map.current) {
        map.current.remove();
      }
      
      // Initialize Mapbox
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-97.7431, 30.2672], // Default to Austin, TX
        zoom: 9,
        maxZoom: 16,
        minZoom: 3,
        renderWorldCopies: false, // Improves performance by not rendering multiple world copies
      });
      
      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      // Create popup but don't add to map yet
      popupRef.current = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        maxWidth: '300px'
      });
      
      map.current.on('load', () => {
        if (!map.current) return;
        
        // Add a data source for our markers
        map.current.addSource('orders', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          },
          cluster: true,
          clusterMaxZoom: 14, // Max zoom to cluster points
          clusterRadius: 50, // Radius of each cluster when clustering points
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
        
        // Add pickup markers layer (for non-clustered points)
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
        
        // Add dropoff markers layer (for non-clustered points)
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
          const pointCount = feature.properties.point_count;
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
        
        // Handle popup display for individual points (pickup and dropoff)
        for (const layerId of ['pickups', 'dropoffs']) {
          map.current.on('mouseenter', layerId, (e) => {
            if (!map.current || !popupRef.current || !e.features || e.features.length === 0) return;
            
            map.current.getCanvas().style.cursor = 'pointer';
            const feature = e.features[0];
            const coordinates = feature.geometry.coordinates.slice() as [number, number];
            const description = `<strong>${feature.properties.driver}</strong><br>
                                ${feature.properties.type === 'pickup' ? 'Pickup: ' : 'Dropoff: '}${feature.properties.address}<br>
                                Order: ${feature.properties.id}`;
            
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
        geocodeAddresses();
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      toast({
        title: "Error initializing map",
        description: "Please check your Mapbox token and try again",
        variant: "destructive",
      });
    }
  }, [mapboxToken]);

  const geocodeAddresses = () => {
    if (!map.current || orders.length === 0) return;
    
    setIsLoading(true);
    mapLocations.current = [];
    
    // Count orders with missing addresses
    const missingCount = orders.filter(order => order.missingAddress === true).length;
    setMissingAddressCount(missingCount);
    
    // Filter orders with valid addresses
    const validOrders = orders.filter(order => order.missingAddress !== true);
    
    processBatch(
      validOrders,
      (locations) => {
        mapLocations.current = locations;
        updateMapMarkers();
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
  };

  const updateMapMarkers = useCallback(() => {
    if (!map.current) return;
    
    // Create GeoJSON data from our locations
    const geojsonData = {
      type: 'FeatureCollection',
      features: mapLocations.current.map(location => ({
        type: 'Feature',
        properties: {
          id: location.id,
          type: location.type,
          address: location.address,
          driver: location.driver
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
    if (mapLocations.current.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      
      mapLocations.current.forEach(location => {
        bounds.extend([location.longitude, location.latitude]);
      });
      
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 13
      });
    }
  }, []);

  // Debounced token save to prevent excessive reinitialization
  const handleTokenSave = debounce(() => {
    if (mapboxToken) {
      localStorage.setItem('mapbox_token', mapboxToken);
      initializeMap();
    } else {
      toast({
        title: "Mapbox token required",
        description: "Please enter a valid Mapbox token",
        variant: "destructive",
      });
    }
  }, 500);

  // Initialize map when token is available
  useEffect(() => {
    if (mapboxToken && !isMapInitialized) {
      initializeMap();
    }
    
    return () => {
      // Cleanup on unmount
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    };
  }, [mapboxToken, initializeMap, isMapInitialized]);

  // Memoize the geocoding function to prevent unnecessary recalculation
  const memoizedGeocodeAddresses = useCallback(geocodeAddresses, [orders, map.current]);

  // Update markers when orders change and map is initialized
  useEffect(() => {
    if (isMapInitialized && orders.length > 0) {
      memoizedGeocodeAddresses();
    }
  }, [isMapInitialized, orders, memoizedGeocodeAddresses]);

  // Render the token input if no token is available
  if (!mapboxToken) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <h2 className="text-xl font-medium">Map Visualization</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Visualize your delivery locations on a map
          </p>
        </div>
        
        <div className="rounded-lg border bg-card p-6 glass-card subtle-shadow space-y-4">
          <div className="flex items-center text-amber-500 dark:text-amber-400 space-x-2 mb-4">
            <AlertCircle size={20} />
            <p className="text-sm">Mapbox API token required for map visualization</p>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            To use the map feature, you need to provide a Mapbox API token. You can get a free token by signing up at{' '}
            <a 
              href="https://www.mapbox.com/signup/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              mapbox.com
            </a>
          </p>
          
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder="Enter your Mapbox token"
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleTokenSave}>Save & Load Map</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium">Map Visualization</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Visualize your delivery locations on a map
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {isLoading ? (
            <div className="text-sm text-gray-500">Loading map data...</div>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={memoizedGeocodeAddresses}
              disabled={!isMapInitialized || orders.length === 0}
            >
              Refresh Map
            </Button>
          )}
        </div>
      </div>
      
      {missingAddressCount > 0 && (
        <div className="flex items-center p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-md">
          <Info className="text-amber-500 mr-2 h-5 w-5" />
          <p className="text-sm text-amber-800 dark:text-amber-400">
            {missingAddressCount} order{missingAddressCount !== 1 ? 's' : ''} with missing address data. 
            Showing {orders.length - missingAddressCount} orders on the map.
          </p>
        </div>
      )}
      
      <div className="rounded-md border overflow-hidden glass-card subtle-shadow">
        <div className="h-[28rem] relative">
          <div ref={mapContainer} className="absolute inset-0" />
          
          <div className="absolute top-4 left-4 p-3 bg-white dark:bg-gray-800 rounded-md shadow z-10 max-w-xs">
            <div className="text-sm font-medium mb-2">Map Legend</div>
            <Separator className="my-2" />
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                <span className="text-xs">Pickup</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                <span className="text-xs">Dropoff</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {mapLocations.current.length === 0 && !isLoading && (
        <div className="text-center p-4 text-gray-500 dark:text-gray-400">
          <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-2" />
          <p>No locations have been geocoded yet.</p>
          <p className="text-sm">Make sure your orders have valid addresses and try refreshing the map.</p>
        </div>
      )}
    </div>
  );
};

export default OrderMap;
