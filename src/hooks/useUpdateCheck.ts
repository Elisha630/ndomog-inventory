import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { getAppVersion } from "@/lib/version";

interface VersionInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  downloadUrl: string;
  minVersion: string;
}

interface UpdateCheckResult {
  updateAvailable: boolean;
  latestVersion: string | null;
  currentVersion: string;
  releaseNotes: string | null;
  downloadUrl: string | null;
  isLoading: boolean;
  error: string | null;
  checkForUpdates: () => Promise<void>;
  dismissUpdate: () => void;
  isDismissed: boolean;
}

const compareVersions = (current: string, latest: string): number => {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);
  
  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;
    
    if (latestPart > currentPart) return 1;
    if (latestPart < currentPart) return -1;
  }
  
  return 0;
};

export const useUpdateCheck = (): UpdateCheckResult => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const currentVersion = getAppVersion();
  const isNativeApp = Capacitor.isNativePlatform();

  const checkForUpdates = useCallback(async () => {
    // Only check for updates in native app
    if (!isNativeApp) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Add cache-busting query param to avoid cached version.json
      const response = await fetch(`/version.json?t=${Date.now()}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch version info");
      }

      const versionInfo: VersionInfo = await response.json();
      
      setLatestVersion(versionInfo.version);
      setReleaseNotes(versionInfo.releaseNotes);
      setDownloadUrl(versionInfo.downloadUrl);

      const comparison = compareVersions(currentVersion, versionInfo.version);
      setUpdateAvailable(comparison > 0);

      // Check if this version was already dismissed
      const dismissedVersion = localStorage.getItem("dismissed-update-version");
      if (dismissedVersion === versionInfo.version) {
        setIsDismissed(true);
      } else {
        setIsDismissed(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Update check failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentVersion, isNativeApp]);

  const dismissUpdate = useCallback(() => {
    if (latestVersion) {
      localStorage.setItem("dismissed-update-version", latestVersion);
      setIsDismissed(true);
    }
  }, [latestVersion]);

  // Check for updates on mount and periodically
  useEffect(() => {
    if (!isNativeApp) return;

    // Initial check after short delay
    const initialTimeout = setTimeout(() => {
      checkForUpdates();
    }, 3000);

    // Check every 6 hours
    const interval = setInterval(() => {
      checkForUpdates();
    }, 6 * 60 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkForUpdates, isNativeApp]);

  return {
    updateAvailable,
    latestVersion,
    currentVersion,
    releaseNotes,
    downloadUrl,
    isLoading,
    error,
    checkForUpdates,
    dismissUpdate,
    isDismissed,
  };
};
