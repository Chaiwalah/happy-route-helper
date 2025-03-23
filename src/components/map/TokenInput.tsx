
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface TokenInputProps {
  mapboxToken: string;
  setMapboxToken: (token: string) => void;
  handleTokenSave: () => void;
}

export const TokenInput: React.FC<TokenInputProps> = ({
  mapboxToken,
  setMapboxToken,
  handleTokenSave
}) => {
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
};
