import React, { createContext, useContext, useState, useEffect } from "react";

interface SettingsContextType {
  locationAllowed: boolean;
  setLocationAllowed: (allowed: boolean) => void;
  shakeEnabled: boolean;
  setShakeEnabled: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [locationAllowed, setLocationAllowedState] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("resqher-location-allowed");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  const [shakeEnabled, setShakeEnabledState] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("resqher-shake-enabled");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem("resqher-location-allowed", locationAllowed.toString());
  }, [locationAllowed]);

  useEffect(() => {
    localStorage.setItem("resqher-shake-enabled", shakeEnabled.toString());
  }, [shakeEnabled]);

  const setLocationAllowed = (allowed: boolean) => setLocationAllowedState(allowed);
  const setShakeEnabled = (enabled: boolean) => setShakeEnabledState(enabled);

  return (
    <SettingsContext.Provider
      value={{ locationAllowed, setLocationAllowed, shakeEnabled, setShakeEnabled }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
