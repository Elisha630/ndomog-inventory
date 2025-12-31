import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FolderOpen, Edit2, Trash2, Merge, Check, X, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useBackButton } from "@/hooks/useBackButton";

interface CategoryInfo {
  name: string;
  count: number;
}

const Categories = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Edit state
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Selection state for bulk operations
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  
  // Merge dialog state
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeTarget, setMergeTarget] = useState("");
  const [merging, setMerging] = useState(false);
  
  // Delete confirmation
  const [deleteCategory, setDeleteCategory] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useBackButton(() => navigate("/"));

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      fetchCategories();
    };
    checkAuth();
  }, [navigate]);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("items")
      .select("category");

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Count items per category
    const categoryMap = new Map<string, number>();
    data?.forEach((item) => {
      const cat = item.category;
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });

    const categoryList: CategoryInfo[] = Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));

    setCategories(categoryList);
    setLoading(false);
  };

  const handleRenameCategory = async (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName.trim().toUpperCase()) {
      setEditingCategory(null);
      setEditValue("");
      return;
    }

    const normalizedNewName = newName.trim().toUpperCase();
    
    // Check if target category already exists
    const existingCategory = categories.find(
      cat => cat.name.toUpperCase() === normalizedNewName && cat.name !== oldName
    );

    setSaving(true);
    
    if (existingCategory) {
      // Merge into existing category
      const { error } = await supabase
        .from("items")
        .update({ category: existingCategory.name })
        .eq("category", oldName);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ 
          title: "Categories Merged", 
          description: `"${oldName}" merged into "${existingCategory.name}"` 
        });
        fetchCategories();
      }
    } else {
      // Simple rename
      const { error } = await supabase
        .from("items")
        .update({ category: normalizedNewName })
        .eq("category", oldName);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ 
          title: "Category Renamed", 
          description: `"${oldName}" renamed to "${normalizedNewName}"` 
        });
        fetchCategories();
      }
    }

    setSaving(false);
    setEditingCategory(null);
    setEditValue("");
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategory) return;

    setDeleting(true);
    const { error } = await supabase
      .from("items")
      .delete()
      .eq("category", deleteCategory);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ 
        title: "Category Deleted", 
        description: `All items in "${deleteCategory}" have been deleted` 
      });
      fetchCategories();
    }

    setDeleting(false);
    setDeleteCategory(null);
  };

  const handleSelectCategory = (categoryName: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryName)) {
      newSelected.delete(categoryName);
    } else {
      newSelected.add(categoryName);
    }
    setSelectedCategories(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCategories.size === filteredCategories.length) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(filteredCategories.map(c => c.name)));
    }
  };

  const handleMergeSelected = async () => {
    if (selectedCategories.size < 2 || !mergeTarget) return;

    setMerging(true);
    const categoriesToMerge = Array.from(selectedCategories).filter(c => c !== mergeTarget);

    for (const category of categoriesToMerge) {
      const { error } = await supabase
        .from("items")
        .update({ category: mergeTarget.toUpperCase() })
        .eq("category", category);

      if (error) {
        toast({ title: "Error", description: `Failed to merge ${category}: ${error.message}`, variant: "destructive" });
        setMerging(false);
        return;
      }
    }

    toast({ 
      title: "Categories Merged", 
      description: `${categoriesToMerge.length} categories merged into "${mergeTarget}"` 
    });
    
    setSelectedCategories(new Set());
    setShowMergeDialog(false);
    setMergeTarget("");
    setMerging(false);
    fetchCategories();
  };

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalItems = categories.reduce((sum, cat) => sum + cat.count, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="font-semibold text-lg text-foreground">Category Management</h1>
      </header>

      <main className="container max-w-2xl mx-auto p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-primary">{categories.length}</div>
              <div className="text-sm text-muted-foreground">Categories</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-primary">{totalItems}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Bulk Actions */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary"
              />
            </div>
            
            {selectedCategories.size >= 2 && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setMergeTarget(Array.from(selectedCategories)[0]);
                    setShowMergeDialog(true);
                  }}
                  className="flex-1"
                >
                  <Merge size={16} className="mr-2" />
                  Merge {selectedCategories.size} Categories
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCategories(new Set())}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderOpen className="text-primary" size={18} />
                All Categories
              </CardTitle>
              {filteredCategories.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  {selectedCategories.size === filteredCategories.length ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>
            <CardDescription>
              Tap to select categories for bulk operations, or edit/delete individually
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredCategories.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {searchQuery ? "No categories match your search" : "No categories yet"}
              </p>
            ) : (
              filteredCategories.map((category) => (
                <div
                  key={category.name}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    selectedCategories.has(category.name) 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:bg-secondary/50"
                  }`}
                >
                  <Checkbox
                    checked={selectedCategories.has(category.name)}
                    onCheckedChange={() => handleSelectCategory(category.name)}
                  />
                  
                  {editingCategory === category.name ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 bg-secondary"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameCategory(category.name, editValue);
                          if (e.key === "Escape") {
                            setEditingCategory(null);
                            setEditValue("");
                          }
                        }}
                        disabled={saving}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleRenameCategory(category.name, editValue)}
                        disabled={saving}
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} className="text-green-500" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingCategory(null);
                          setEditValue("");
                        }}
                        disabled={saving}
                      >
                        <X size={14} className="text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{category.name}</div>
                      </div>
                      <Badge variant="secondary">{category.count} items</Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingCategory(category.name);
                          setEditValue(category.name);
                        }}
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteCategory(category.name)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Tip: All category names are automatically converted to UPPERCASE
        </p>
      </main>

      {/* Merge Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Categories</DialogTitle>
            <DialogDescription>
              Select the target category. All items from other selected categories will be moved to this category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Merge into:</label>
              <Select value={mergeTarget} onValueChange={setMergeTarget}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target category" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(selectedCategories).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              <strong>Categories to merge:</strong>
              <div className="flex flex-wrap gap-1 mt-2">
                {Array.from(selectedCategories)
                  .filter(c => c !== mergeTarget)
                  .map((cat) => (
                    <Badge key={cat} variant="outline">{cat}</Badge>
                  ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)} disabled={merging}>
              Cancel
            </Button>
            <Button onClick={handleMergeSelected} disabled={!mergeTarget || merging}>
              {merging ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Merge size={16} className="mr-2" />}
              Merge Categories
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCategory} onOpenChange={() => setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all items in the "{deleteCategory}" category. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
              Delete All Items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Categories;
