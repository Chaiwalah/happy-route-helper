
"use client"

import React from 'react';

const PricingInfo: React.FC = () => {
  return (
    <div>
      <h3 className="text-lg font-medium">Advanced Billing System</h3>
      <p className="text-sm text-muted-foreground">
        Pricing automatically calculated based on route type and distance using Mapbox Directions API
      </p>
      
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="p-3 border rounded-md bg-background">
          <div className="font-semibold mb-1">Single-Order Under 25 Miles</div>
          <div>Flat rate of $25</div>
        </div>
        <div className="p-3 border rounded-md bg-background">
          <div className="font-semibold mb-1">Single-Order Over 25 Miles</div>
          <div>$1.10 per mile (one-way)</div>
        </div>
        <div className="p-3 border rounded-md bg-background">
          <div className="font-semibold mb-1">Multi-Stop Routes</div>
          <div>$1.10 per mile + $12 per additional stop</div>
        </div>
      </div>
    </div>
  );
};

export default PricingInfo;
