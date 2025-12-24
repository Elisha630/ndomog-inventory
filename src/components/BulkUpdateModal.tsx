import { useState } from "react";
import { Package, Plus, Minus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Item } from "./ItemsList";

interface BulkUpdateModalProps {
  open: boolean;
  onClose: () => void;
  selectedItems: Item[];
  onConfirm: (updates: { item: Item; newQuantity: number }[]) => void;
}

const BulkUpdateModal = ({ open, onClose, selectedItems, onConfirm }: BulkUpdateModalProps) => {
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    selectedItems.forEach((item) => {
      initial[item.id] = item.quantity;
    });
    return initial;
  });

  const handleQuantityChange = (itemId: string, value: number) => {
    setQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(0, value),
    }));
  };

  const handleIncrement = (itemId: string) => {
    setQuantities((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
  };

  const handleDecrement = (itemId: string) => {
    setQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) - 1),
    }));
  };

  const handleConfirm = () => {
    const updates = selectedItems
      .filter((item) => quantities[item.id] !== item.quantity)
      .map((item) => ({
        item,
        newQuantity: quantities[item.id],
      }));
    onConfirm(updates);
    onClose();
  };

  const hasChanges = selectedItems.some((item) => quantities[item.id] !== item.quantity);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-popover border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Package className="text-primary" size={20} />
            Bulk Update Quantities
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <p className="text-sm text-muted-foreground mb-4">
            Update quantities for {selectedItems.length} selected item{selectedItems.length > 1 ? "s" : ""}
          </p>

          <ScrollArea className="max-h-80">
            <div className="space-y-3 pr-4">
              {selectedItems.map((item) => {
                const currentQty = item.quantity;
                const newQty = quantities[item.id] ?? currentQty;
                const diff = newQty - currentQty;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                      {diff !== 0 && (
                        <p className={`text-xs mt-1 ${diff > 0 ? "text-success" : "text-destructive"}`}>
                          {diff > 0 ? `+${diff}` : diff} from current ({currentQty})
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDecrement(item.id)}
                        disabled={newQty <= 0}
                      >
                        <Minus size={14} />
                      </Button>
                      <Input
                        type="number"
                        min="0"
                        value={newQty}
                        onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                        className="w-16 h-8 text-center bg-secondary border-border"
                      />
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleIncrement(item.id)}
                      >
                        <Plus size={14} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!hasChanges}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Confirm Updates
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUpdateModal;
