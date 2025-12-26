import { useState, useRef, useEffect } from "react";
import { Camera, Scan, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
import { supabase } from "@/integrations/supabase/client";

interface SmartCameraProps {
  onBarcodeScan: (barcode: string) => void;
  onPhotoCapture: (photoUrl: string) => void;
}

const SmartCamera = ({ onBarcodeScan, onPhotoCapture }: SmartCameraProps) => {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (open) {
      setScannedBarcode(null);
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [open]);

  const startCamera = async () => {
    setScanning(true);
    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.ITF,
        BarcodeFormat.CODABAR,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.PDF_417,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const codeReader = new BrowserMultiFormatReader(hints);
      codeReaderRef.current = codeReader;

      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();

      if (videoInputDevices.length === 0) {
        toast.error("No camera found");
        setOpen(false);
        return;
      }

      const backCamera = videoInputDevices.find(
        (device) =>
          device.label.toLowerCase().includes("back") ||
          device.label.toLowerCase().includes("rear")
      );
      const selectedDeviceId = backCamera?.deviceId || videoInputDevices[0].deviceId;

      if (videoRef.current) {
        controlsRef.current = await codeReader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result) => {
            if (result) {
              const barcode = result.getText();
              const format = result.getBarcodeFormat();
              setScannedBarcode(barcode);
              toast.success(`Detected ${BarcodeFormat[format]}: ${barcode}`);
            }
          }
        );
      }
    } catch (error) {
      console.error("Error starting camera:", error);
      toast.error("Could not access camera. Please check permissions.");
      setOpen(false);
    }
  };

  const stopCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    codeReaderRef.current = null;
    setScanning(false);
  };

  const handleUseBarcode = () => {
    if (scannedBarcode) {
      onBarcodeScan(scannedBarcode);
      setOpen(false);
      setScannedBarcode(null);
    }
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

    canvas.toBlob(
      async (blob) => {
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

          const {
            data: { publicUrl },
          } = supabase.storage.from("item-photos").getPublicUrl(fileName);

          onPhotoCapture(publicUrl);
          toast.success("Photo captured!");
          setOpen(false);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Failed to upload photo";
          toast.error(message);
        } finally {
          setUploading(false);
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const dismissBarcode = () => {
    setScannedBarcode(null);
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="flex-1 h-20 flex-col gap-2"
        onClick={() => setOpen(true)}
      >
        <Camera size={20} />
        <span className="text-xs">Camera</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-popover border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Camera className="text-primary" size={20} />
              Smart Camera
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              {scanning && !scannedBarcode && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <div className="w-48 h-48 border-2 border-primary/50 rounded-lg">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
                  </div>
                </div>
              )}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {scannedBarcode && (
              <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Scan size={16} className="text-primary shrink-0" />
                  <span className="text-sm font-mono truncate">{scannedBarcode}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={dismissBarcode}
                  >
                    <X size={14} />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    className="h-7 w-7 bg-primary text-primary-foreground"
                    onClick={handleUseBarcode}
                  >
                    <Check size={14} />
                  </Button>
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground text-center">
              {scannedBarcode
                ? "Barcode detected! Use it or capture a photo"
                : "Point at a barcode to scan, or capture a photo"}
            </p>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                <X size={16} className="mr-2" />
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground"
                onClick={capturePhoto}
                disabled={uploading}
              >
                <Camera size={16} className="mr-2" />
                {uploading ? "Uploading..." : "Capture Photo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SmartCamera;
