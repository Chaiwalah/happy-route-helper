
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

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
  const [token, setToken] = useState(mapboxToken || '');
  const [tokenValid, setTokenValid] = useState(false);

  // Validate token format when it changes
  useEffect(() => {
    // Basic Mapbox token format validation (starts with 'pk.')
    setTokenValid(token.trim().startsWith('pk.') && token.length > 20);
  }, [token]);

  const onSave = () => {
    if (!tokenValid) {
      toast({
        title: "Invalid token format",
        description: "Please enter a valid Mapbox public token (starts with 'pk.')",
        variant: "destructive",
      });
      return;
    }
    
    setMapboxToken(token);
    setTimeout(() => {
      handleTokenSave();
    }, 100);
  }
  
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
            placeholder="Enter your Mapbox token (starts with pk.)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="flex-1"
          />
          <Button onClick={onSave} disabled={!tokenValid}>Save & Load Map</Button>
        </div>
      </div>
    </div>
  );
};
