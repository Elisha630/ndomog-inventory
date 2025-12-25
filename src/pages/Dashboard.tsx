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
      subscribeToChanges();

      // Listen for online event to sync data
      const handleOnline = () => {
        fetchItems();
        fetchActivityLogs();
      };

      window.addEventListener("app-online", handleOnline);
      return () => {
        window.removeEventListener("app-online", handleOnline);
      };
    }
  }, [loading]);

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
    // Calculate the date 20 days ago
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .gte("created_at", twentyDaysAgo.toISOString())
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
    
    // Insert activity log
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      user_email: userEmail,
      action,
      item_name: itemName,
      details,
    });

    // Create notification for OTHER users only (exclude current user)
    const { data: profiles } = await supabase.from("profiles").select("id");
    if (profiles) {
      const otherProfiles = profiles.filter((profile) => profile.id !== user.id);
      if (otherProfiles.length > 0) {
        const notifications = otherProfiles.map((profile) => ({
          user_id: profile.id,
          action_user_email: userEmail,
          action,
          item_name: itemName,
          details,
        }));
        await supabase.from("notifications").insert(notifications);
      }
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
      }
    } else {
      const { error } = await supabase
        .from("items")
        .insert({ ...itemData, created_by: user?.id });

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        await logActivity("added", itemData.name, `Added with quantity: ${itemData.quantity}`);
        toast({ title: "Success", description: "Item added successfully" });
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

  const filteredItems = items
    .filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
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
        {showActivity && <ActivityLogPanel logs={activityLogs} />}

        <StatsCards {...stats} />

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <SearchBar 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery}
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
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
