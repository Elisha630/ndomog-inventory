import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Upload, Trash2, Eye, EyeOff, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBackButton } from "@/hooks/useBackButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Release {
  id: string;
  version: string;
  release_date: string;
  release_notes: string;
  download_url: string;
  min_android_version: string | null;
  file_size_bytes: number | null;
  is_published: boolean;
  created_at: string;
}

const AdminReleases = () => {
  const navigate = useNavigate();
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    version: "",
    release_date: new Date().toISOString().split("T")[0],
    release_notes: "",
    download_url: "",
    min_android_version: "",
    is_published: false,
  });

  useBackButton(() => navigate(-1));

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please sign in to access this page");
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      toast.error("You don't have permission to access this page");
      navigate("/");
      return;
    }

    setIsAdmin(true);
    fetchReleases();
  };

  const fetchReleases = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("app_releases")
      .select("*")
      .order("release_date", { ascending: false });

    if (error) {
      toast.error("Failed to fetch releases");
      console.error(error);
    } else {
      setReleases(data || []);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".apk")) {
      toast.error("Please upload an APK file");
      return;
    }

    setUploading(true);
    const fileName = `${formData.version || "release"}-${Date.now()}.apk`;

    const { data, error } = await supabase.storage
      .from("apk-files")
      .upload(fileName, file);

    if (error) {
      toast.error("Failed to upload APK file");
      console.error(error);
    } else {
      const { data: urlData } = supabase.storage
        .from("apk-files")
        .getPublicUrl(fileName);

      setFormData((prev) => ({
        ...prev,
        download_url: urlData.publicUrl,
      }));
      toast.success("APK uploaded successfully");
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.version || !formData.release_notes || !formData.download_url) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    const releaseData = {
      version: formData.version,
      release_date: formData.release_date,
      release_notes: formData.release_notes,
      download_url: formData.download_url,
      min_android_version: formData.min_android_version || null,
      is_published: formData.is_published,
    };

    if (editingId) {
      const { error } = await supabase
        .from("app_releases")
        .update(releaseData)
        .eq("id", editingId);

      if (error) {
        toast.error("Failed to update release");
        console.error(error);
      } else {
        toast.success("Release updated successfully");
        resetForm();
        fetchReleases();
      }
    } else {
      const { error } = await supabase.from("app_releases").insert(releaseData);

      if (error) {
        if (error.code === "23505") {
          toast.error("A release with this version already exists");
        } else {
          toast.error("Failed to create release");
        }
        console.error(error);
      } else {
        toast.success("Release created successfully");
        resetForm();
        fetchReleases();
      }
    }
    setSaving(false);
  };

  const handleEdit = (release: Release) => {
    setFormData({
      version: release.version,
      release_date: release.release_date,
      release_notes: release.release_notes,
      download_url: release.download_url,
      min_android_version: release.min_android_version || "",
      is_published: release.is_published,
    });
    setEditingId(release.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("app_releases").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete release");
      console.error(error);
    } else {
      toast.success("Release deleted successfully");
      fetchReleases();
    }
  };

  const togglePublish = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("app_releases")
      .update({ is_published: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update publish status");
      console.error(error);
    } else {
      toast.success(currentStatus ? "Release unpublished" : "Release published");
      fetchReleases();
    }
  };

  const resetForm = () => {
    setFormData({
      version: "",
      release_date: new Date().toISOString().split("T")[0],
      release_notes: "",
      download_url: "",
      min_android_version: "",
      is_published: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Checking permissions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="font-semibold text-lg text-foreground">Release Manager</h1>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={16} className="mr-1" />
            New Release
          </Button>
        )}
      </header>

      <main className="container max-w-2xl mx-auto p-4 space-y-4">
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{editingId ? "Edit Release" : "New Release"}</span>
                <Button variant="ghost" size="icon" onClick={resetForm}>
                  <X size={18} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="version">Version *</Label>
                    <Input
                      id="version"
                      placeholder="e.g., 1.2.0"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="release_date">Release Date *</Label>
                    <Input
                      id="release_date"
                      type="date"
                      value={formData.release_date}
                      onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="release_notes">Release Notes *</Label>
                  <Textarea
                    id="release_notes"
                    placeholder="• Feature 1&#10;• Bug fix 2&#10;• Improvement 3"
                    rows={4}
                    value={formData.release_notes}
                    onChange={(e) => setFormData({ ...formData, release_notes: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min_android">Minimum Android Version</Label>
                  <Input
                    id="min_android"
                    placeholder="e.g., 8.0"
                    value={formData.min_android_version}
                    onChange={(e) => setFormData({ ...formData, min_android_version: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>APK File</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Download URL"
                      value={formData.download_url}
                      onChange={(e) => setFormData({ ...formData, download_url: e.target.value })}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" disabled={uploading} asChild>
                      <label className="cursor-pointer">
                        <Upload size={16} className="mr-1" />
                        {uploading ? "Uploading..." : "Upload"}
                        <input
                          type="file"
                          accept=".apk"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={uploading}
                        />
                      </label>
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="is_published"
                    checked={formData.is_published}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                  />
                  <Label htmlFor="is_published">Publish immediately</Label>
                </div>

                <Button type="submit" className="w-full" disabled={saving}>
                  <Save size={16} className="mr-1" />
                  {saving ? "Saving..." : editingId ? "Update Release" : "Create Release"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : releases.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No releases yet. Create your first release!
            </CardContent>
          </Card>
        ) : (
          releases.map((release) => (
            <Card key={release.id} className={!release.is_published ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">v{release.version}</CardTitle>
                    <Badge variant={release.is_published ? "default" : "secondary"}>
                      {release.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => togglePublish(release.id, release.is_published)}
                    >
                      {release.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(release)}>
                      <Pencil size={16} />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 size={16} className="text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Release v{release.version}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. The release will be permanently deleted.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(release.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {new Date(release.release_date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  {release.min_android_version && ` • Android ${release.min_android_version}+`}
                  {release.file_size_bytes && ` • ${formatFileSize(release.file_size_bytes)}`}
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-3">
                  {release.release_notes}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {release.download_url}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
};

export default AdminReleases;
