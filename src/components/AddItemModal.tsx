import { useState, useEffect, useRef } from "react";
import { Package, Upload, X, Loader2, Sparkles, Camera, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Item } from "./ItemsList";
import BarcodeScanner from "./BarcodeScanner";
import { useModalBackHandler } from "@/hooks/useBackButton";

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (item: Omit<Item, "id" | "created_by" | "created_at" | "updated_at">) => void;
  editItem?: Item | null;
  categories: string[];
}

const AddItemModal = ({ open, onClose, onSubmit, editItem, categories }: AddItemModalProps) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [details, setDetails] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [buyingPrice, setBuyingPrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [quantity, setQuantity] = useState(0);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [uploading, setUploading] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle back button for modal
  useModalBackHandler(open, onClose, "add-item-modal");

  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setCategory(editItem.category);
      setIsNewCategory(false);
      setNewCategoryName("");
      setDetails(editItem.details || "");
      setPhotoUrl(editItem.photo_url || "");
      setBuyingPrice(editItem.buying_price);
      setSellingPrice(editItem.selling_price);
      setQuantity(editItem.quantity);
      setLowStockThreshold(editItem.low_stock_threshold || 5);
    } else {
      resetForm();
    }
  }, [editItem, open]);

  const resetForm = () => {
    setName("");
    setCategory("");
    setIsNewCategory(false);
    setNewCategoryName("");
    setDetails("");
    setPhotoUrl("");
    setBuyingPrice(0);
    setSellingPrice(0);
    setQuantity(0);
    setLowStockThreshold(5);
  };

  const handleCategoryChange = (value: string) => {
    if (value === "new") {
      setIsNewCategory(true);
      setCategory("");
    } else {
      setIsNewCategory(false);
      setCategory(value);
    }
  };

  const handleBarcodeScan = (barcode: string) => {
    // Set the barcode as item name - user can modify as needed
    setName(barcode);
    toast.info("Barcode scanned! You can now fill in the item details.");
  };

  const handleGenerateDescription = async () => {
    if (!name.trim()) {
      toast.error("Please enter an item name first");
      return;
    }
    const finalCategory = isNewCategory ? newCategoryName : category;
    if (!finalCategory.trim()) {
      toast.error("Please select a category first");
      return;
    }

    setGeneratingDescription(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-inventory", {
        body: {
          type: "generate_description",
          itemName: name,
          category: finalCategory,
        },
      });

      if (error) throw error;
      if (data?.result) {
        setDetails(data.result);
        toast.success("Description generated!");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to generate description";
      toast.error(message);
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("item-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("item-photos")
        .getPublicUrl(fileName);

      setPhotoUrl(publicUrl);
      toast.success("Image uploaded successfully");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to upload image";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraStream(stream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      toast.error("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    stopCamera();

    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast.error("Failed to capture photo");
        return;
      }

      setUploading(true);
      try {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("item-photos")
          .upload(fileName, blob, { contentType: "image/jpeg" });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("item-photos")
          .getPublicUrl(fileName);

        setPhotoUrl(publicUrl);
        toast.success("Photo captured and uploaded!");
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to upload photo";
        toast.error(message);
      } finally {
        setUploading(false);
      }
    }, "image/jpeg", 0.9);
  };

  const handleRemoveImage = async () => {
    if (photoUrl) {
      const fileName = photoUrl.split("/").pop();
      if (fileName) {
        await supabase.storage.from("item-photos").remove([fileName]);
      }
      setPhotoUrl("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = isNewCategory ? newCategoryName : category;
    if (!finalCategory.trim()) {
      toast.error("Please select or enter a category");
      return;
    }
    onSubmit({
      name,
      category: finalCategory,
      details: details || null,
      photo_url: photoUrl || null,
      buying_price: buyingPrice,
      selling_price: sellingPrice,
      quantity,
      low_stock_threshold: lowStockThreshold,
    });
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-popover border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Package className="text-primary" size={20} />
            {editItem ? "Edit Item" : "Add New Item"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Wireless Mouse"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-secondary border-border"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Type / Category *</Label>
            <Select 
              value={isNewCategory ? "new" : category} 
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="new">
                  <span className="flex items-center gap-2">
                    <Plus size={14} />
                    Add New Category
                  </span>
                </SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isNewCategory && (
              <Input
                id="newCategory"
                placeholder="Enter new category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="bg-secondary border-border mt-2"
                required
              />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="details">Details (optional)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-primary hover:text-primary/80 gap-1"
                onClick={handleGenerateDescription}
                disabled={generatingDescription || !name.trim() || (!category.trim() && !newCategoryName.trim())}
              >
                {generatingDescription ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                {generatingDescription ? "Generating..." : "AI Generate"}
              </Button>
            </div>
            <Textarea
              id="details"
              placeholder="Additional details about the item..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="bg-secondary border-border resize-none"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Photo (optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {photoUrl ? (
              <div className="relative">
                <img src={photoUrl} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={handleRemoveImage}
                >
                  <X size={12} />
                </Button>
              </div>
            ) : showCamera ? (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-40 object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={stopCamera}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-primary text-primary-foreground"
                    onClick={capturePhoto}
                  >
                    <Camera size={16} className="mr-1" />
                    Capture
                  </Button>
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 h-20 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Upload size={20} />
                  )}
                  <span className="text-xs">{uploading ? "Uploading..." : "Upload"}</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 h-20 flex-col gap-2"
                  onClick={startCamera}
                  disabled={uploading}
                >
                  <Camera size={20} />
                  <span className="text-xs">Camera</span>
                </Button>
                <BarcodeScanner onScan={handleBarcodeScan} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buyingPrice">Buying Price (KES)</Label>
              <Input
                id="buyingPrice"
                type="number"
                min="0"
                value={buyingPrice}
                onChange={(e) => setBuyingPrice(parseInt(e.target.value) || 0)}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling Price (KES)</Label>
              <Input
                id="sellingPrice"
                type="number"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(parseInt(e.target.value) || 0)}
                className="bg-secondary border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lowStockThreshold">Low Stock Alert</Label>
              <Input
                id="lowStockThreshold"
                type="number"
                min="0"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 0)}
                className="bg-secondary border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
              {editItem ? "Save Changes" : "Add Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemModal;
