import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";

/**
 * Calculates the bass intensity from microphone frequency data.
 * Bass is typically found in the first few frequency bins.
 * @param frequencyData The Uint8Array containing frequency data from the microphone.
 * @returns A normalized bass intensity value between 0 and 1.
 */
export function calculateBassIntensity(frequencyData: Uint8Array): number {
  if (!frequencyData || frequencyData.length === 0) {
    return 0;
  }

  // Calculate bass intensity (first 12 bins for sub-bass/bass)
  let bassSum = 0;
  const bassBins = Math.min(12, frequencyData.length);
  for (let i = 0; i < bassBins; i++) {
    bassSum += frequencyData[i];
  }
  // Normalize to 0-1 range (max value for a bin is 255)
  return bassSum / (bassBins * 255);
}

