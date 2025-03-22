
"use client"

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Issue } from '@/utils/invoiceCalculator';

interface IssueFlaggingProps {
  issues: Issue[];
}

export function IssueFlagging({ issues }: IssueFlaggingProps) {
  // Group issues by driver for better organization
  const issuesByDriver = issues.reduce((groups, issue) => {
    if (!groups[issue.driver]) {
      groups[issue.driver] = [];
    }
    groups[issue.driver].push(issue);
    return groups;
  }, {} as Record<string, Issue[]>);
  
  const errorCount = issues.filter(issue => issue.severity === 'error').length;
  const warningCount = issues.filter(issue => issue.severity === 'warning').length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium">Data Quality Report</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {issues.length === 0 
              ? 'All orders validated successfully' 
              : `${issues.length} potential issue${issues.length > 1 ? 's' : ''} that need review`}
          </p>
        </div>
        
        {issues.length > 0 && (
          <div className="flex space-x-2">
            {errorCount > 0 && (
              <Badge variant="destructive" className="px-2 py-1">
                {errorCount} Error{errorCount > 1 ? 's' : ''}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 px-2 py-1">
                {warningCount} Warning{warningCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        )}
      </div>
      
      {issues.length === 0 ? (
        <Card>
          <CardContent className="pt-6 pb-4 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20 mb-3">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6 text-green-600 dark:text-green-400" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">All Clear</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                All orders have been validated and are ready for invoicing
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(issuesByDriver).map(([driver, driverIssues]) => (
            <Card key={driver} className="overflow-hidden animate-scale-in">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{driver}</CardTitle>
                <CardDescription>
                  {driverIssues.length} issue{driverIssues.length > 1 ? 's' : ''} requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {driverIssues.map((issue, index) => (
                    <div 
                      key={`${issue.orderId}-${index}`}
                      className={`p-4 ${
                        issue.severity === 'error' 
                          ? 'bg-red-50/50 dark:bg-red-900/10' 
                          : index % 2 === 0 ? 'bg-amber-50/30 dark:bg-amber-900/5' : 'bg-amber-50/60 dark:bg-amber-900/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center">
                            {issue.severity === 'error' ? (
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className="h-5 w-5 text-red-500 mr-1.5" 
                                viewBox="0 0 20 20" 
                                fill="currentColor"
                              >
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className="h-5 w-5 text-amber-500 mr-1.5" 
                                viewBox="0 0 20 20" 
                                fill="currentColor"
                              >
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            )}
                            <span className={`font-medium ${
                              issue.severity === 'error' ? 'text-red-800 dark:text-red-400' : 'text-amber-800 dark:text-amber-400'
                            }`}>
                              {issue.message}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 ml-6">
                            {issue.details}
                          </p>
                        </div>
                        <div className="text-xs font-mono bg-white/80 dark:bg-gray-800/80 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
                          {issue.orderId}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
