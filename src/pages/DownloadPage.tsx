import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Box,
  Download,
  Smartphone,
  Shield,
  BarChart3,
  LogOut,
  FileText,
  Calendar,
} from 'lucide-react';

interface AppRelease {
  id: string;
  version: string;
  download_url: string;
  release_notes: string;
  release_date: string;
  file_size_bytes: number | null;
}

export default function DownloadPage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [releases, setReleases] = useState<AppRelease[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReleases();
  }, []);

  const fetchReleases = async () => {
    try {
      const { data, error } = await supabase
        .from('app_releases')
        .select('*')
        .eq('is_published', true)
        .order('release_date', { ascending: false });

      if (error) throw error;
      setReleases(data || []);
    } catch (error) {
      console.error('Error fetching releases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (release: AppRelease) => {
    window.open(release.download_url, '_blank');
    toast({
      title: 'Download started',
      description: `Downloading Ndomog Investment v${release.version}`,
    });
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const latestRelease = releases[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Box className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Ndomog Investment</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <div className="mx-auto w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mb-6">
            <Box className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Ndomog Investment</h1>
          <p className="text-xl text-muted-foreground mb-8">
            A powerful inventory management application designed to help you track, manage, and
            optimize your inventory with ease.
          </p>

          {latestRelease && (
            <Button size="lg" className="gap-2" onClick={() => handleDownload(latestRelease)}>
              <Download className="w-5 h-5" />
              Download v{latestRelease.version}
            </Button>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-card/50">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-border">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Mobile First</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Native Android app optimized for mobile use, allowing you to manage inventory on
                  the go.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Secure & Private</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Your data is protected with PIN lock and biometric authentication for maximum
                  security.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Real-time Sync</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Cloud synchronization keeps your inventory data up-to-date across all your
                  devices.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Downloads Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-center mb-8">Available Downloads</h2>

          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : releases.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-8 text-center text-muted-foreground">
                No releases available yet. Check back soon!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {releases.map((release) => (
                <Card key={release.id} className="border-border">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">Version {release.version}</h3>
                          {release === latestRelease && (
                            <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                              Latest
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(release.release_date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {formatFileSize(release.file_size_bytes)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{release.release_notes}</p>
                      </div>
                      <Button
                        variant="outline"
                        className="gap-2 shrink-0"
                        onClick={() => handleDownload(release)}
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Ndomog Investment. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
