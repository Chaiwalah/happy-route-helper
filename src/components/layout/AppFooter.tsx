
"use client"

import React from 'react';

export const AppFooter: React.FC = () => {
  return (
    <footer className="border-t py-6 md:py-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <p className="text-sm text-muted-foreground md:text-left text-center">
          Dispatch & Invoicing Assistant — Simplify your delivery management workflow
        </p>
      </div>
    </footer>
  );
};
