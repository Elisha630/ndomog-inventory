import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Box,
  Upload,
  Trash2,
  Download,
  LogOut,
  File,
  RefreshCw,
  Plus,
} from 'lucide-react';

interface StorageFile {
  name: string;
  id: string;
  created_at: string;
  metadata: {
    size: number;
    mimetype: string;
  } | null;
}

const BUCKET_NAME = 'apk-bucket';

export default function AdminPage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.from(BUCKET_NAME).list('', {
        sortBy: { column: 'created_at', order: 'desc' },
      });

      if (error) throw error;
      setFiles((data || []) as unknown as StorageFile[]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load files';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { error } = await supabase.storage.from(BUCKET_NAME).upload(file.name, file, {
        cacheControl: '3600',
        upsert: true,
      });

      if (error) throw error;

      toast({
        title: 'Upload successful',
        description: `${file.name} has been uploaded.`,
      });
      fetchFiles();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: message,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    try {
      const { error } = await supabase.storage.from(BUCKET_NAME).remove([fileName]);

      if (error) throw error;

      toast({
        title: 'File deleted',
        description: `${fileName} has been removed.`,
      });
      fetchFiles();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Delete failed';
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: message,
      });
    }
  };

  const handleDownload = async (fileName: string) => {
    try {
      const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
      window.open(data.publicUrl, '_blank');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Download failed';
      toast({
        variant: 'destructive',
        title: 'Download failed',
        description: message,
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Box className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-lg">Ndomog Investment</span>
              <span className="ml-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                Admin
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">APK File Manager</h1>
            <p className="text-muted-foreground">
              Manage APK files in the storage bucket
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchFiles} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Upload File
                </>
              )}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUpload}
              accept=".apk,.aab"
              className="hidden"
            />
          </div>
        </div>

        {/* Files List */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Uploaded Files</CardTitle>
            <CardDescription>
              {files.length} file{files.length !== 1 ? 's' : ''} in bucket
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No files uploaded yet</p>
                <p className="text-sm">Upload your first APK file to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {files.map((file) => (
                  <div
                    key={file.id || file.name}
                    className="py-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                        <File className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.metadata?.size || 0)} •{' '}
                          {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(file.name)}
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(file.name)}
                        title="Delete"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
