
"use client"

import React from 'react';
import { Issue } from '@/utils/invoiceTypes';
import { IssueFlagging } from '@/components/IssueFlagging';
import { ScrollArea } from '@/components/ui/scroll-area';

interface IssuesTabProps {
  issues: Issue[];
}

export const IssuesTab: React.FC<IssuesTabProps> = ({ issues }) => {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Issues & Recommendations</h2>
        <p className="text-muted-foreground">
          Review potential issues with orders and assignments
        </p>
      </div>
      
      <ScrollArea className="h-[calc(100vh-220px)]">
        <IssueFlagging issues={issues} />
      </ScrollArea>
    </div>
  );
};
