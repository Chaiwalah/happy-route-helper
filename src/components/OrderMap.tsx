
"use client"

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { DeliveryOrder } from '@/utils/csvParser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';

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

  const initializeMap = () => {
    if (!mapContainer.current || !mapboxToken) return;
    
    try {
      // Initialize Mapbox
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-97.7431, 30.2672], // Default to Austin, TX
        zoom: 9
      });
      
      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      map.current.on('load', () => {
        if (!map.current) return;
        
        // Add a data source for our markers
        map.current.addSource('orders', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });
        
        // Add pickup markers layer
        map.current.addLayer({
          id: 'pickups',
          type: 'circle',
          source: 'orders',
          filter: ['==', 'type', 'pickup'],
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
          filter: ['==', 'type', 'dropoff'],
          paint: {
            'circle-radius': 8,
            'circle-color': '#ef4444',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });
        
        setIsMapInitialized(true);
        toast({
          description: "Map initialized successfully",
        });
        
        // Now geocode the addresses
        geocodeAddresses();
      });
      
      // Add popup on hover
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
      });
      
      map.current.on('mouseenter', 'pickups', (e) => {
        if (!map.current || !e.features || e.features.length === 0) return;
        
        map.current.getCanvas().style.cursor = 'pointer';
        const feature = e.features[0];
        const coordinates = feature.geometry.coordinates.slice() as [number, number];
        const description = `<strong>${feature.properties.driver}</strong><br>
                            Pickup: ${feature.properties.address}<br>
                            Order: ${feature.properties.id}`;
        
        popup.setLngLat(coordinates).setHTML(description).addTo(map.current);
      });
      
      map.current.on('mouseenter', 'dropoffs', (e) => {
        if (!map.current || !e.features || e.features.length === 0) return;
        
        map.current.getCanvas().style.cursor = 'pointer';
        const feature = e.features[0];
        const coordinates = feature.geometry.coordinates.slice() as [number, number];
        const description = `<strong>${feature.properties.driver}</strong><br>
                            Dropoff: ${feature.properties.address}<br>
                            Order: ${feature.properties.id}`;
        
        popup.setLngLat(coordinates).setHTML(description).addTo(map.current);
      });
      
      map.current.on('mouseleave', 'pickups', () => {
        if (!map.current) return;
        map.current.getCanvas().style.cursor = '';
        popup.remove();
      });
      
      map.current.on('mouseleave', 'dropoffs', () => {
        if (!map.current) return;
        map.current.getCanvas().style.cursor = '';
        popup.remove();
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      toast({
        title: "Error initializing map",
        description: "Please check your Mapbox token and try again",
        variant: "destructive",
      });
    }
  };

  const geocodeAddresses = async () => {
    if (!map.current || orders.length === 0) return;
    
    setIsLoading(true);
    mapLocations.current = [];
    
    try {
      // Create a batch of promises for all geocoding requests
      const geocodePromises = [];
      
      // Process pickup addresses - adding null checks
      for (const order of orders) {
        if (order.pickup) {
          geocodePromises.push(
            geocodeAddress(order.pickup).then(coords => {
              if (coords) {
                mapLocations.current.push({
                  id: order.id || 'unknown',
                  type: 'pickup',
                  address: order.pickup,
                  driver: order.driver || 'Unassigned',
                  latitude: coords[1],
                  longitude: coords[0]
                });
              }
            })
          );
        }
        
        if (order.dropoff) {
          geocodePromises.push(
            geocodeAddress(order.dropoff).then(coords => {
              if (coords) {
                mapLocations.current.push({
                  id: order.id || 'unknown',
                  type: 'dropoff',
                  address: order.dropoff,
                  driver: order.driver || 'Unassigned',
                  latitude: coords[1],
                  longitude: coords[0]
                });
              }
            })
          );
        }
      }
      
      // Wait for all geocoding requests to complete
      await Promise.all(geocodePromises);
      
      // Update the map with markers
      updateMapMarkers();
      
      toast({
        description: `Geocoded ${mapLocations.current.length} locations`,
      });
    } catch (error) {
      console.error('Error geocoding addresses:', error);
      toast({
        title: "Error geocoding addresses",
        description: "Some addresses could not be geocoded",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
    try {
      // Geocode the address using Mapbox Geocoding API
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&limit=1`
      );
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        return data.features[0].center;
      }
      
      return null;
    } catch (error) {
      console.error('Error geocoding address:', address, error);
      return null;
    }
  };

  const updateMapMarkers = () => {
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
        maxZoom: 15
      });
    }
  };

  const handleTokenSave = () => {
    if (mapboxToken) {
      localStorage.setItem('mapbox_token', mapboxToken);
      
      if (map.current) {
        // Clean up existing map
        map.current.remove();
        map.current = null;
      }
      
      setIsMapInitialized(false);
      initializeMap();
    } else {
      toast({
        title: "Mapbox token required",
        description: "Please enter a valid Mapbox token",
        variant: "destructive",
      });
    }
  };

  // Initialize map when token is available
  useEffect(() => {
    if (mapboxToken && !map.current) {
      initializeMap();
    }
  }, [mapboxToken]);

  // Update markers when orders change and map is initialized
  useEffect(() => {
    if (isMapInitialized && orders.length > 0) {
      geocodeAddresses();
    }
  }, [isMapInitialized, orders]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

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
              onClick={geocodeAddresses}
              disabled={!isMapInitialized || orders.length === 0}
            >
              Refresh Map
            </Button>
          )}
        </div>
      </div>
      
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
