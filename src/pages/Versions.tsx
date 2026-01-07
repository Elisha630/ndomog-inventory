import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Calendar, Smartphone, ExternalLink } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBackButton } from "@/hooks/useBackButton";
import { getAppVersion } from "@/lib/version";
import { supabase } from "@/integrations/supabase/client";

interface VersionInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  downloadUrl: string;
  minAndroidVersion?: string;
}

const Versions = () => {
  const navigate = useNavigate();
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentVersion = getAppVersion();
  const isNative = Capacitor.isNativePlatform();

  useBackButton(() => navigate(-1));

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        // Fetch from database (published releases only)
        const { data, error: dbError } = await supabase
          .from("app_releases")
          .select("version, release_date, release_notes, download_url, min_android_version")
          .eq("is_published", true)
          .order("release_date", { ascending: false });

        if (dbError) throw dbError;

        if (data && data.length > 0) {
          setVersions(
            data.map((r) => ({
              version: r.version,
              releaseDate: r.release_date,
              releaseNotes: r.release_notes,
              downloadUrl: r.download_url,
              minAndroidVersion: r.min_android_version || undefined,
            }))
          );
        } else {
          // Fallback to static file if no releases in database
          const response = await fetch("/versions.json?" + Date.now());
          if (response.ok) {
            const fileData = await response.json();
            setVersions(fileData.versions || []);
          }
        }
      } catch (err) {
        console.error("Error fetching versions:", err);
        setError("Failed to load version history");
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
  }, []);

  const handleDownload = async (downloadUrl: string, version: string) => {
    // Check if downloadUrl is already a full URL (from cloud storage)
    const isFullUrl = downloadUrl.startsWith("http://") || downloadUrl.startsWith("https://");
    
    // If it's a relative path, prepend the base URL
    const fullUrl = isFullUrl 
      ? downloadUrl 
      : (isNative ? "https://ndomog.lovable.app" : window.location.origin) + downloadUrl;
    
    if (isNative) {
      // On native, open in external browser using Capacitor Browser plugin
      try {
        await Browser.open({ url: fullUrl });
      } catch (err) {
        console.error("Failed to open browser:", err);
        // Fallback to window.open
        window.open(fullUrl, "_blank");
      }
    } else {
      // On web, open the download URL
      window.open(fullUrl, "_blank", "noopener,noreferrer");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="font-semibold text-lg text-foreground">Version History</h1>
          <p className="text-xs text-muted-foreground">Current: v{currentVersion}</p>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto p-4 space-y-4">
        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : error ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              {error}
            </CardContent>
          </Card>
        ) : (
          versions.map((ver, index) => {
            const isCurrent = ver.version === currentVersion;
            const isLatest = index === 0;

            return (
              <Card
                key={ver.version}
                className={isCurrent ? "border-primary/50 bg-primary/5" : ""}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">v{ver.version}</CardTitle>
                      {isCurrent && (
                        <Badge variant="secondary" className="text-xs">
                          Installed
                        </Badge>
                      )}
                      {isLatest && !isCurrent && (
                        <Badge className="text-xs bg-primary">
                          Latest
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription className="flex flex-wrap items-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(ver.releaseDate)}
                    </span>
                    {ver.minAndroidVersion && (
                      <span className="flex items-center gap-1">
                        <Smartphone size={12} />
                        Android {ver.minAndroidVersion}+
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground whitespace-pre-line">
                    {ver.releaseNotes}
                  </div>
                  
                  <Button
                    variant={isCurrent ? "outline" : "default"}
                    size="sm"
                    className="w-full"
                    onClick={() => handleDownload(ver.downloadUrl, ver.version)}
                  >
                    {isNative ? (
                      <>
                        <ExternalLink className="mr-2" size={14} />
                        Open in Browser to Download
                      </>
                    ) : (
                      <>
                        <Download className="mr-2" size={14} />
                        Download APK
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}

        <p className="text-xs text-muted-foreground text-center pt-4">
          Download older versions if the latest version is incompatible with your device.
        </p>
      </main>
    </div>
  );
};

export default Versions;
