"use client";

import { createContext, useContext } from "react";

const AppNameContext = createContext<string>("LinkZen");

export function AppNameProvider({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <AppNameContext.Provider value={name}>{children}</AppNameContext.Provider>
  );
}

export function useAppName() {
  return useContext(AppNameContext);
}
