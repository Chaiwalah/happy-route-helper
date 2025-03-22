
"use client"

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Issue } from '@/utils/invoiceCalculator';

interface IssuesListProps {
  issues: Issue[];
}

export const IssuesList: React.FC<IssuesListProps> = ({ issues }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Potential Issues</CardTitle>
        <CardDescription>
          {issues.length > 0 
            ? `${issues.length} potential issue${issues.length > 1 ? 's' : ''} detected` 
            : "No issues detected"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {issues.length > 0 ? (
          <div className="space-y-4">
            {issues.map((issue, index) => (
              <div 
                key={`${issue.orderId}-${index}`}
                className={`p-4 rounded-md border ${
                  issue.severity === 'error' 
                    ? 'bg-red-50/50 border-red-200 dark:bg-red-900/20 dark:border-red-800/40' 
                    : 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/40'
                } animate-slide-in`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className={`text-sm font-medium ${
                      issue.severity === 'error' ? 'text-red-800 dark:text-red-400' : 'text-amber-800 dark:text-amber-400'
                    }`}>
                      {issue.severity === 'error' ? 'Error' : 'Warning'}: {issue.message}
                    </h4>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {issue.details}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium">{issue.orderId}</div>
                    <div className="text-gray-500">{issue.driver}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 mx-auto flex items-center justify-center mb-4">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-8 w-8 text-green-600 dark:text-green-400" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">All clear!</p>
            <p className="mt-1">No issues detected with the current orders</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
