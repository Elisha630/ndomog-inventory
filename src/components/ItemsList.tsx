import { useState } from "react";
import { Package, Plus, Minus, Trash2, Edit, AlertTriangle, CheckSquare, Square, Layers, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import PhotoViewerModal from "@/components/PhotoViewerModal";
import BulkUpdateModal from "@/components/BulkUpdateModal";

export interface Item {
  id: string;
  name: string;
  category: string;
  category_id: string | null;
  details: string | null;
  photo_url: string | null;
  buying_price: number;
  selling_price: number;
  quantity: number;
  low_stock_threshold: number;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ItemsListProps {
  items: Item[];
  onAddItem: () => void;
  onEditItem: (item: Item) => void;
  onUpdateQuantity: (item: Item, change: number) => void;
  onBulkUpdateQuantity: (updates: { item: Item; newQuantity: number }[]) => void;
  onDeleteItem: (item: Item) => void;
}

const ItemsList = ({ items, onAddItem, onEditItem, onUpdateQuantity, onBulkUpdateQuantity, onDeleteItem }: ItemsListProps) => {
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string; name: string } | null>(null);
  const [quantityChange, setQuantityChange] = useState<{ item: Item; change: number } | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const isLowStock = (item: Item) => item.quantity <= item.low_stock_threshold && item.quantity > 0;
  const isOutOfStock = (item: Item) => item.quantity === 0;

  const handleQuantityChangeRequest = (item: Item, change: number) => {
    setQuantityChange({ item, change });
  };

  const confirmQuantityChange = () => {
    if (quantityChange) {
      onUpdateQuantity(quantityChange.item, quantityChange.change);
      setQuantityChange(null);
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedItems(new Set());
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((item) => item.id)));
    }
  };

  const handleBulkUpdateConfirm = (updates: { item: Item; newQuantity: number }[]) => {
    onBulkUpdateQuantity(updates);
    setShowBulkUpdate(false);
    setSelectionMode(false);
    setSelectedItems(new Set());
  };

  const getSelectedItemsList = () => {
    return items.filter((item) => selectedItems.has(item.id));
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItem((prev) => prev === itemId ? null : itemId);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <Package className="empty-state-icon mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">No items found</h3>
        <p className="text-muted-foreground mb-6">Start by adding your first item</p>
        <Button onClick={onAddItem} className="nav-button-primary">
          <Plus size={18} />
          Add First Item
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant={selectionMode ? "default" : "secondary"}
            size="sm"
            onClick={toggleSelectionMode}
            className={selectionMode ? "bg-primary text-primary-foreground" : ""}
          >
            <Layers size={16} className="mr-1" />
            {selectionMode ? "Cancel" : "Bulk Edit"}
          </Button>
          {selectionMode && (
            <>
              <Button variant="secondary" size="sm" onClick={selectAll}>
                {selectedItems.size === items.length ? (
                  <>
                    <CheckSquare size={16} className="mr-1" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Square size={16} className="mr-1" />
                    Select All
                  </>
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedItems.size} selected
              </span>
            </>
          )}
        </div>
        {selectionMode && selectedItems.size > 0 && (
          <Button
            size="sm"
            onClick={() => setShowBulkUpdate(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Update Quantities
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item, index) => {
          const isExpanded = expandedItem === item.id;
          return (
            <Collapsible
              key={item.id}
              open={isExpanded}
              onOpenChange={() => !selectionMode && toggleExpanded(item.id)}
            >
              <div
                className={`stat-card animate-fade-in relative p-3 cursor-pointer ${
                  isOutOfStock(item) ? "border-destructive/50" : isLowStock(item) ? "border-warning/50" : ""
                } ${selectionMode && selectedItems.has(item.id) ? "ring-2 ring-primary" : ""}`}
                style={{ animationDelay: `${index * 30}ms` }}
                onClick={() => {
                  if (selectionMode) {
                    toggleItemSelection(item.id);
                  } else {
                    toggleExpanded(item.id);
                  }
                }}
              >
                {selectionMode && (
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => toggleItemSelection(item.id)}
                      className="h-5 w-5"
                    />
                  </div>
                )}

                {(isLowStock(item) || isOutOfStock(item)) && (
                  <div className={`absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-0.5 ${
                    isOutOfStock(item) ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"
                  }`}>
                    <AlertTriangle size={10} />
                    {isOutOfStock(item) ? "Out" : "Low"}
                  </div>
                )}

                {/* Compact view - always visible */}
                <div className={`flex items-center justify-between gap-2 ${selectionMode ? "pl-6" : ""}`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {item.photo_url && (
                      <img
                        src={item.photo_url}
                        alt={item.name}
                        className="w-10 h-10 rounded-md object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingPhoto({ url: item.photo_url!, name: item.name });
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground text-sm truncate">{item.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{item.category}</span>
                        <span>•</span>
                        <span className={`font-semibold ${
                          isOutOfStock(item) ? "text-destructive" : isLowStock(item) ? "text-warning" : "text-foreground"
                        }`}>
                          Qty: {item.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {!selectionMode && (
                    <div className="h-7 w-7 flex-shrink-0 flex items-center justify-center">
                      {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                    </div>
                  )}
                </div>

                {/* Expanded content */}
                <CollapsibleContent className="mt-3 space-y-3">
                  {item.details && (
                    <p className="text-xs text-muted-foreground">{item.details}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-secondary/50 rounded-md p-2">
                      <span className="text-muted-foreground block">Buying</span>
                      <span className="text-foreground font-medium">KES {item.buying_price.toLocaleString()}</span>
                    </div>
                    <div className="bg-secondary/50 rounded-md p-2">
                      <span className="text-muted-foreground block">Selling</span>
                      <span className="text-success font-medium">KES {item.selling_price.toLocaleString()}</span>
                    </div>
                  </div>

                  {!selectionMode && (
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuantityChangeRequest(item, -1);
                          }}
                          disabled={item.quantity <= 0}
                        >
                          <Minus size={12} />
                        </Button>
                        <span className={`font-semibold w-8 text-center text-sm ${
                          isOutOfStock(item) ? "text-destructive" : isLowStock(item) ? "text-warning" : "text-foreground"
                        }`}>
                          {item.quantity}
                        </span>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuantityChangeRequest(item, 1);
                          }}
                        >
                          <Plus size={12} />
                        </Button>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditItem(item);
                          }}
                        >
                          <Edit size={12} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteItem(item);
                          }}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  )}
                </CollapsibleContent>

                {selectionMode && (
                  <div className="flex items-center justify-center pt-2 mt-2 border-t border-border">
                    <span className={`text-sm font-semibold ${
                      isOutOfStock(item) ? "text-destructive" : isLowStock(item) ? "text-warning" : "text-foreground"
                    }`}>
                      Qty: {item.quantity}
                    </span>
                  </div>
                )}
              </div>
            </Collapsible>
          );
        })}
      </div>

      {viewingPhoto && (
        <PhotoViewerModal
          open={!!viewingPhoto}
          onClose={() => setViewingPhoto(null)}
          photoUrl={viewingPhoto.url}
          itemName={viewingPhoto.name}
        />
      )}

      {showBulkUpdate && (
        <BulkUpdateModal
          open={showBulkUpdate}
          onClose={() => setShowBulkUpdate(false)}
          selectedItems={getSelectedItemsList()}
          onConfirm={handleBulkUpdateConfirm}
        />
      )}

      <AlertDialog open={!!quantityChange} onOpenChange={() => setQuantityChange(null)}>
        <AlertDialogContent className="bg-popover border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {quantityChange?.change && quantityChange.change > 0 ? "Add to Stock" : "Remove from Stock"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {quantityChange?.change && quantityChange.change > 0 ? (
                <>
                  Add 1 unit to <span className="font-semibold text-foreground">{quantityChange?.item.name}</span>?
                  <br />
                  <span className="text-muted-foreground">
                    Current: {quantityChange?.item.quantity} → New: {quantityChange?.item.quantity + 1}
                  </span>
                </>
              ) : (
                <>
                  Remove 1 unit from <span className="font-semibold text-foreground">{quantityChange?.item.name}</span>?
                  <br />
                  <span className="text-muted-foreground">
                    Current: {quantityChange?.item.quantity} → New: {Math.max(0, (quantityChange?.item.quantity || 0) - 1)}
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmQuantityChange}
              className={quantityChange?.change && quantityChange.change > 0 
                ? "bg-success text-success-foreground hover:bg-success/90" 
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
            >
              {quantityChange?.change && quantityChange.change > 0 ? "Add" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ItemsList;
