
"use client"

import React from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';

interface AppHeaderProps {
  orderCount: number;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ orderCount }) => {
  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 hidden md:flex">
          <h1 className="text-xl font-medium tracking-tight">Dispatch & Invoicing Assistant</h1>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <div className="text-sm text-muted-foreground mr-4">
            {orderCount > 0 && (
              <span>{orderCount} order{orderCount !== 1 && 's'} loaded</span>
            )}
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
