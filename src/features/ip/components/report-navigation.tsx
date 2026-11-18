"use client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

const ReportNavigationContext = createContext<{
  address: string | null; rememberAddress: (address: string | null) => void;
} | null>(null);

/** Per-page memory only: never persist a visitor address or share it across requests. */
export function ReportNavigationProvider({ children }: { children: ReactNode }) {
  const [address, rememberAddress] = useState<string | null>(null);
  const value = useMemo(() => ({ address, rememberAddress }), [address]);
  return <ReportNavigationContext.Provider value={value}>{children}</ReportNavigationContext.Provider>;
}

export function useReportNavigation() {
  const context = useContext(ReportNavigationContext);
  if (!context) throw new Error("Report navigation provider is missing");
  return context;
}
