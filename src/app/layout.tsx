
import React from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="app-root">
      {children}
      <Toaster />
      <PerformanceMonitor />
    </div>
  );
}
