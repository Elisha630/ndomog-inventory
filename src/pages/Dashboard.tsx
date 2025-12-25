import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import StatsCards from "@/components/StatsCards";
import SearchBar from "@/components/SearchBar";
import ItemsList, { type Item } from "@/components/ItemsList";
import ActivityLogPanel, { type ActivityLog } from "@/components/ActivityLogPanel";
import AddItemModal from "@/components/AddItemModal";
import UsernamePrompt from "@/components/UsernamePrompt";

import RestockSuggestions from "@/components/RestockSuggestions";
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

interface UserProfile {
  id: string;
  username: string | null;
  email: string;
  avatar_url: string | null;
}

const Dashboard = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showActivity, setShowActivity] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get unique categories from items
  const categories = Array.from(new Set(items.map((item) => item.category))).sort();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserEmail(session.user.email || null);
      
      // Check if user has a username
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", session.user.id)
        .maybeSingle();
      
      if (profile?.username) {
        setCurrentUsername(profile.username);
      } else {
        setShowUsernamePrompt(true);
      }
      
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      } else if (session) {
        setUserEmail(session.user.email || null);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!loading) {
      fetchItems();
      fetchActivityLogs();
      fetchUserProfiles();
      subscribeToChanges();

      // Listen for online event to sync data
      const handleOnline = () => {
        fetchItems();
        fetchActivityLogs();
        fetchUserProfiles();
      };

      window.addEventListener("app-online", handleOnline);
      return () => {
        window.removeEventListener("app-online", handleOnline);
      };
    }
  }, [loading]);

  const fetchUserProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, email, avatar_url");

    if (!error && data) {
      const profileMap = new Map<string, string>();
      data.forEach((profile) => {
        if (profile.username) {
          profileMap.set(profile.id, profile.username);
        } else {
          profileMap.set(profile.id, profile.email.split("@")[0]);
        }
        // Also store avatar URL with a special key
        if (profile.avatar_url) {
          profileMap.set(`avatar_${profile.id}`, profile.avatar_url);
        }
      });
      setUserProfiles(profileMap);
    }
  };

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setItems(data || []);
    }
  };

  const fetchActivityLogs = async () => {
    // Calculate the date 7 days ago (1 week)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching activity logs:", error);
    } else {
      setActivityLogs(data || []);
    }

    // Trigger cleanup of old logs (fire and forget)
    try {
      supabase.rpc("cleanup_old_activity_logs");
    } catch {
      // Ignore errors - cleanup is best effort
    }
  };

  const subscribeToChanges = () => {
    const itemsChannel = supabase
      .channel("items-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => {
        fetchItems();
      })
      .subscribe();

    const logsChannel = supabase
      .channel("logs-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs" }, () => {
        fetchActivityLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(logsChannel);
    };
  };

  const logActivity = async (action: string, itemName: string, details?: string) => {
    if (!userEmail) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Insert activity log (still stores email for data integrity, but we display username)
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      user_email: userEmail,
      action,
      item_name: itemName,
      details,
    });

    // Create notification for OTHER users only (exclude current user)
    // Use username or email prefix for display
    const displayName = currentUsername || userEmail.split("@")[0];
    const { data: profiles } = await supabase.from("profiles").select("id");
    if (profiles) {
      const otherProfiles = profiles.filter((profile) => profile.id !== user.id);
      if (otherProfiles.length > 0) {
        const notifications = otherProfiles.map((profile) => ({
          user_id: profile.id,
          action_user_email: userEmail, // Still store email for lookup
          action,
          item_name: itemName,
          details,
        }));
        await supabase.from("notifications").insert(notifications);
      }
    }
  };

  const normalizeItemText = async (itemId: string, name: string, category: string, description: string | null) => {
    try {
      const { data, error } = await supabase.functions.invoke("ai-inventory", {
        body: {
          type: "normalize_text",
          itemName: name,
          category: category,
          description: description || "",
        },
      });

      if (error) {
        console.error("AI normalization error:", error);
        return;
      }

      if (data?.result) {
        try {
          // Extract JSON from the response (AI might return it wrapped in markdown)
          let jsonStr = data.result;
          
          // Remove markdown code blocks if present
          const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
          }
          
          // Try to find JSON object in the response
          const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
          if (objectMatch) {
            jsonStr = objectMatch[0];
          }
          
          const normalized = JSON.parse(jsonStr);
          
          // Check if anything changed (case-insensitive comparison to detect actual corrections)
          const nameChanged = normalized.name && normalized.name.toLowerCase() !== name.toLowerCase() 
            ? true 
            : (normalized.name && normalized.name !== name);
          const categoryChanged = normalized.category && normalized.category.toLowerCase() !== category.toLowerCase()
            ? true
            : (normalized.category && normalized.category !== category);
          const descriptionChanged = normalized.description && description && normalized.description !== description;
          
          if (nameChanged || categoryChanged || descriptionChanged) {
            const updates: Record<string, string> = {};
            if (nameChanged) updates.name = normalized.name;
            if (categoryChanged) updates.category = normalized.category;
            if (descriptionChanged && normalized.description) updates.details = normalized.description;
            
            const { error: updateError } = await supabase
              .from("items")
              .update(updates)
              .eq("id", itemId);
              
            if (!updateError) {
              console.log("Item normalized:", updates);
              // Refresh items to show changes
              fetchItems();
            }
          }
        } catch (parseError) {
          console.error("Failed to parse AI response:", data.result, parseError);
        }
      }
    } catch (error) {
      console.error("Failed to normalize item:", error);
    }
  };

  const handleAddOrEditItem = async (itemData: Omit<Item, "id" | "created_by" | "created_at" | "updated_at">) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (editItem) {
      const { error } = await supabase
        .from("items")
        .update(itemData)
        .eq("id", editItem.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        await logActivity("updated", itemData.name, "Modified item details");
        toast({ title: "Success", description: "Item updated successfully" });
        // Normalize text in background
        normalizeItemText(editItem.id, itemData.name, itemData.category, itemData.details);
      }
    } else {
      const { data: newItem, error } = await supabase
        .from("items")
        .insert({ ...itemData, created_by: user?.id })
        .select()
        .single();

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        await logActivity("added", itemData.name, `Added with quantity: ${itemData.quantity}`);
        toast({ title: "Success", description: "Item added successfully" });
        // Normalize text in background
        if (newItem) {
          normalizeItemText(newItem.id, itemData.name, itemData.category, itemData.details);
        }
      }
    }

    setShowAddModal(false);
    setEditItem(null);
  };

  const handleUpdateQuantity = async (item: Item, change: number) => {
    const newQuantity = Math.max(0, item.quantity + change);
    const actualChange = newQuantity - item.quantity;
    
    const { error } = await supabase
      .from("items")
      .update({ quantity: newQuantity })
      .eq("id", item.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const action = actualChange > 0 ? "added" : "removed";
      const absChange = Math.abs(actualChange);
      const detail = actualChange > 0 
        ? `Added ${absChange} unit${absChange !== 1 ? 's' : ''} (now ${newQuantity})` 
        : `Removed ${absChange} unit${absChange !== 1 ? 's' : ''} (now ${newQuantity})`;
      await logActivity(action, item.name, detail);
    }
  };

  const handleBulkUpdateQuantity = async (updates: { item: Item; newQuantity: number }[]) => {
    for (const update of updates) {
      const { error } = await supabase
        .from("items")
        .update({ quantity: update.newQuantity })
        .eq("id", update.item.id);

      if (error) {
        toast({ title: "Error", description: `Failed to update ${update.item.name}: ${error.message}`, variant: "destructive" });
      }
    }

    // Log all updates as a single bulk action with quantity changes
    const itemDetails = updates.map((u) => {
      const change = u.newQuantity - u.item.quantity;
      const changeText = change > 0 ? `+${change}` : `${change}`;
      return `${u.item.name} (${changeText})`;
    }).join(", ");
    await logActivity("updated", `${updates.length} items`, `Bulk updated: ${itemDetails}`);
    toast({ title: "Success", description: `Updated ${updates.length} item(s) successfully` });
  };

  const handleDeleteItem = async () => {
    if (!deleteItem) return;

    const { error } = await supabase
      .from("items")
      .delete()
      .eq("id", deleteItem.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await logActivity("removed", deleteItem.name, "Deleted from inventory");
      toast({ title: "Success", description: "Item deleted successfully" });
    }

    setDeleteItem(null);
  };

  const handleRenameCategory = async (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;
    
    // Update all items with the old category name
    const { error } = await supabase
      .from("items")
      .update({ category: newName.trim() })
      .eq("category", oldName);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Category renamed from "${oldName}" to "${newName}"` });
      fetchItems();
    }
  };

  const filteredItems = items
    .filter((item) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(searchLower) ||
        item.category.toLowerCase().includes(searchLower) ||
        (item.details && item.details.toLowerCase().includes(searchLower));
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const stats = {
    totalItems: filteredItems.reduce((sum, item) => sum + item.quantity, 0),
    totalCost: filteredItems.reduce((sum, item) => sum + item.buying_price * item.quantity, 0),
    potentialProfit: filteredItems.reduce((sum, item) => sum + (item.selling_price - item.buying_price) * item.quantity, 0),
    lowStockCount: filteredItems.filter((item) => item.quantity <= (item.low_stock_threshold || 5) && item.quantity > 0).length + filteredItems.filter((item) => item.quantity === 0).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        showActivity={showActivity}
        setShowActivity={setShowActivity}
        onAddItem={() => setShowAddModal(true)}
      />

      <main className="container max-w-7xl mx-auto p-4 space-y-6">
        {showActivity && <ActivityLogPanel logs={activityLogs} userProfiles={userProfiles} />}

        <StatsCards {...stats} />

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <SearchBar 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery}
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            onRenameCategory={handleRenameCategory}
          />
          <RestockSuggestions items={items} />
        </div>

        <ItemsList
          items={filteredItems}
          onAddItem={() => setShowAddModal(true)}
          onEditItem={(item) => {
            setEditItem(item);
            setShowAddModal(true);
          }}
          onUpdateQuantity={handleUpdateQuantity}
          onBulkUpdateQuantity={handleBulkUpdateQuantity}
          onDeleteItem={(item) => setDeleteItem(item)}
        />
      </main>

      <AddItemModal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditItem(null);
        }}
        onSubmit={handleAddOrEditItem}
        editItem={editItem}
        categories={categories}
      />

      <UsernamePrompt
        open={showUsernamePrompt}
        onComplete={(username) => {
          setCurrentUsername(username);
          setShowUsernamePrompt(false);
          fetchUserProfiles();
        }}
      />

      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent className="bg-popover border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
