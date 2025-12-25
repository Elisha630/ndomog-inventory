import { NativeBiometric, BiometryType } from "capacitor-native-biometric";

export interface BiometricCheckResult {
  isAvailable: boolean;
  biometryType: BiometryType;
  errorCode?: number;
}

export const biometricService = {
  /**
   * Check if biometric authentication is available on the device
   */
  async isAvailable(): Promise<BiometricCheckResult> {
    try {
      const result = await NativeBiometric.isAvailable();
      return {
        isAvailable: result.isAvailable,
        biometryType: result.biometryType,
      };
    } catch (error) {
      console.log("Biometric check failed:", error);
      return {
        isAvailable: false,
        biometryType: BiometryType.NONE,
      };
    }
  },

  /**
   * Get a human-readable name for the biometry type
   */
  getBiometryTypeName(type: BiometryType): string {
    switch (type) {
      case BiometryType.FACE_ID:
        return "Face ID";
      case BiometryType.TOUCH_ID:
        return "Touch ID";
      case BiometryType.FINGERPRINT:
        return "Fingerprint";
      case BiometryType.FACE_AUTHENTICATION:
        return "Face Authentication";
      case BiometryType.IRIS_AUTHENTICATION:
        return "Iris Authentication";
      case BiometryType.MULTIPLE:
        return "Biometric";
      default:
        return "Biometric";
    }
  },

  /**
   * Authenticate using biometrics
   */
  async authenticate(options?: {
    reason?: string;
    title?: string;
    subtitle?: string;
    description?: string;
  }): Promise<boolean> {
    try {
      const checkResult = await this.isAvailable();
      if (!checkResult.isAvailable) {
        return false;
      }

      await NativeBiometric.verifyIdentity({
        reason: options?.reason || "Verify your identity to unlock the app",
        title: options?.title || "Authentication Required",
        subtitle: options?.subtitle,
        description: options?.description,
      });

      return true;
    } catch (error) {
      console.log("Biometric authentication failed:", error);
      return false;
    }
  },
};

export { BiometryType };
