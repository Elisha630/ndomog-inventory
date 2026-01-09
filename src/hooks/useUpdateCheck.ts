import { useState, useEffect, useCallback } from "react";
import { getAppVersion } from "@/lib/version";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";

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

  const checkForUpdates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch latest published release from database
      const { data, error: dbError } = await supabase
        .from("app_releases")
        .select("version, release_notes, download_url")
        .eq("is_published", true)
        .order("release_date", { ascending: false })
        .limit(1)
        .single();

      if (dbError) {
        throw new Error("Failed to fetch version info");
      }

      if (data) {
        setLatestVersion(data.version);
        setReleaseNotes(data.release_notes);
        setDownloadUrl(data.download_url);

        // Only show update available on native platforms
        // Web version is always the latest deployed version
        const isNative = Capacitor.isNativePlatform();
        if (isNative) {
          const comparison = compareVersions(currentVersion, data.version);
          setUpdateAvailable(comparison > 0);

          // Check if this version was already dismissed
          const dismissedVersion = localStorage.getItem("dismissed-update-version");
          if (dismissedVersion === data.version) {
            setIsDismissed(true);
          } else {
            setIsDismissed(false);
          }
        } else {
          // Web version - never show update prompt
          setUpdateAvailable(false);
          setIsDismissed(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Update check failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentVersion]);

  const dismissUpdate = useCallback(() => {
    if (latestVersion) {
      localStorage.setItem("dismissed-update-version", latestVersion);
      setIsDismissed(true);
    }
  }, [latestVersion]);

  // Check for updates on mount and periodically
  useEffect(() => {
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
  }, [checkForUpdates]);

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
