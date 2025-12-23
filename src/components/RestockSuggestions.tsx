import { useState } from "react";
import { Sparkles, Loader2, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Item } from "./ItemsList";

interface RestockSuggestionsProps {
  items: Item[];
}

interface Suggestion {
  itemId: string;
  itemName: string;
  suggestion: string;
}

const RestockSuggestions = ({ items }: RestockSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const lowStockItems = items.filter(
    (item) => item.quantity <= item.low_stock_threshold
  );

  const generateSuggestions = async () => {
    if (lowStockItems.length === 0) {
      toast.info("No low stock items to analyze");
      return;
    }

    setLoading(true);
    setShowPanel(true);
    setSuggestions([]);

    try {
      const newSuggestions: Suggestion[] = [];

      for (const item of lowStockItems.slice(0, 5)) {
        const { data, error } = await supabase.functions.invoke("ai-inventory", {
          body: {
            type: "restock_suggestion",
            itemName: item.name,
            category: item.category,
            currentQuantity: item.quantity,
            threshold: item.low_stock_threshold,
          },
        });

        if (error) {
          console.error("Error getting suggestion for", item.name, error);
          continue;
        }

        if (data?.result) {
          newSuggestions.push({
            itemId: item.id,
            itemName: item.name,
            suggestion: data.result,
          });
        }
      }

      setSuggestions(newSuggestions);
      
      if (newSuggestions.length === 0) {
        toast.error("Could not generate suggestions");
      } else {
        toast.success(`Generated ${newSuggestions.length} restock suggestions`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to generate suggestions";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (lowStockItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {!showPanel ? (
        <Button
          onClick={generateSuggestions}
          variant="secondary"
          className="gap-2"
          disabled={loading}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} className="text-primary" />
          )}
          AI Restock Suggestions ({lowStockItems.length} items)
        </Button>
      ) : (
        <div className="stat-card space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              AI Restock Suggestions
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowPanel(false)}
            >
              <X size={14} />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Analyzing inventory patterns...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.itemId}
                  className="p-3 bg-secondary/50 rounded-lg border border-border"
                >
                  <h4 className="font-medium text-foreground mb-1">{suggestion.itemName}</h4>
                  <p className="text-sm text-muted-foreground">{suggestion.suggestion}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No suggestions available. Click the button to generate.
            </p>
          )}

          {!loading && (
            <Button
              onClick={generateSuggestions}
              variant="outline"
              size="sm"
              className="w-full gap-2"
            >
              <Sparkles size={14} />
              Refresh Suggestions
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default RestockSuggestions;