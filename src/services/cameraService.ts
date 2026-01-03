import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource, CameraPermissionType } from "@capacitor/camera";

export interface CameraPermissionStatus {
  camera: "granted" | "denied" | "prompt" | "prompt-with-rationale";
  photos: "granted" | "denied" | "prompt" | "prompt-with-rationale";
}

// Check if we're running on a native platform
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

// Request camera permissions on native platforms
export const requestCameraPermission = async (): Promise<boolean> => {
  if (!isNativePlatform()) {
    // On web, we'll handle permissions via browser APIs
    return true;
  }

  try {
    const permissions = await Camera.requestPermissions({
      permissions: ["camera", "photos"],
    });

    return permissions.camera === "granted";
  } catch (error) {
    console.error("Error requesting camera permissions:", error);
    return false;
  }
};

// Check current camera permission status
export const checkCameraPermission = async (): Promise<CameraPermissionStatus | null> => {
  if (!isNativePlatform()) {
    return null;
  }

  try {
    const permissions = await Camera.checkPermissions();
    return permissions as CameraPermissionStatus;
  } catch (error) {
    console.error("Error checking camera permissions:", error);
    return null;
  }
};

// Capture photo using native camera (for native platforms)
export const capturePhotoNative = async (): Promise<string | null> => {
  if (!isNativePlatform()) {
    return null;
  }

  try {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      console.log("Camera permission denied");
      return null;
    }

    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      correctOrientation: true,
      width: 1200,
      height: 1200,
    });

    return image.dataUrl || null;
  } catch (error) {
    console.error("Error capturing photo:", error);
    return null;
  }
};

// Pick photo from gallery using native picker (for native platforms)
export const pickPhotoFromGallery = async (): Promise<string | null> => {
  if (!isNativePlatform()) {
    return null;
  }

  try {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      console.log("Photo library permission denied");
      return null;
    }

    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
      correctOrientation: true,
      width: 1200,
      height: 1200,
    });

    return image.dataUrl || null;
  } catch (error) {
    console.error("Error picking photo from gallery:", error);
    return null;
  }
};

// Convert data URL to Blob for upload
export const dataUrlToBlob = (dataUrl: string): Blob => {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
};
