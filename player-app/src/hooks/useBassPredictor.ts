"use client";

import { useRef, useCallback, useMemo, useState } from "react";

/**
 * Bass hit record with timestamp and intensity
 */
export interface BassHit {
  timestamp: number; // in milliseconds
  intensity: number; // 0-1
  predicted?: boolean; // if this was predicted (for tracking accuracy)
}

/**
 * Pattern found in bass hits
 */
export interface BassPattern {
  intervals: number[]; // intervals in ms between hits
  confidence: number; // 0-1, how confident we are in this pattern
  occurrences: number; // how many times this pattern has occurred
  lastOccurrence: number; // timestamp of last occurrence
}

/**
 * Prediction for next bass hit
 */
export interface BassPrediction {
  timestamp: number; // predicted time in ms
  intensity: number; // predicted intensity (0-1)
  confidence: number; // 0-1, confidence in this prediction
  pattern: BassPattern | null; // the pattern that led to this prediction
  leadTime: number; // how far ahead we're predicting (in ms)
}

export interface BassPredictorState {
  recentHits: BassHit[]; // recent bass hits (rolling window)
  patterns: BassPattern[]; // detected patterns
  nextPrediction: BassPrediction | null; // next predicted hit
  accuracy: number; // 0-1, how accurate predictions have been
  isLearning: boolean; // true if still learning patterns
}

/**
 * Configuration for the bass predictor
 */
export interface BassPredictorConfig {
  bassThreshold: number; // minimum bass intensity to consider a "hit" (0-1)
  minHitInterval: number; // minimum ms between hits (to avoid duplicates)
  patternWindowSize: number; // how many hits to look back for patterns
  minPatternOccurrences: number; // minimum occurrences to consider a valid pattern
  predictionLeadTime: number; // how far ahead to predict (in ms)
  patternToleranceMs: number; // tolerance for matching intervals (in ms)
  maxPatternsTracked: number; // maximum number of patterns to track
}

const DEFAULT_CONFIG: BassPredictorConfig = {
  bassThreshold: 0.3, // 30% intensity minimum
  minHitInterval: 100, // 100ms minimum between hits
  patternWindowSize: 8, // look at last 8 hits for patterns
  minPatternOccurrences: 2, // need at least 2 occurrences
  predictionLeadTime: 150, // predict 150ms ahead (for HUE latency)
  patternToleranceMs: 50, // 50ms tolerance for matching
  maxPatternsTracked: 10, // track top 10 patterns
};

/**
 * Hook for bass hit prediction based on pattern detection
 * 
 * This hook analyzes bass hits over time to find repeating patterns
 * and predict when the next bass hit will occur. This is useful for
 * triggering lights/effects ahead of time to account for latency.
 */
export function useBassPredictor(
  config: Partial<BassPredictorConfig> = {}
): {
  state: BassPredictorState;
  recordBassHit: (intensity: number, timestamp: number) => void;
  getPrediction: (currentTime: number) => BassPrediction | null;
  reset: () => void;
  shouldTriggerEarly: (currentTime: number) => { trigger: boolean; prediction: BassPrediction | null };
} {
  const fullConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  
  // Use state instead of refs so React re-renders automatically
  const [recentHits, setRecentHits] = useState<BassHit[]>([]);
  const [patterns, setPatterns] = useState<BassPattern[]>([]);
  const [prediction, setPrediction] = useState<BassPrediction | null>(null);
  const [predictions, setPredictions] = useState<{ total: number; correct: number }>({ total: 0, correct: 0 });
  const [isLearning, setIsLearning] = useState<boolean>(true);
  
  /**
   * Record a new bass hit and update patterns
   */
  const recordBassHit = useCallback((intensity: number, timestamp: number) => {
    setRecentHits(currentHits => {
      // Only record hits above threshold
      if (intensity < fullConfig.bassThreshold) {
        return currentHits;
      }
      
      // Avoid duplicate hits (too close together)
      const lastHit = currentHits[currentHits.length - 1];
      if (lastHit && timestamp - lastHit.timestamp < fullConfig.minHitInterval) {
        console.log(`⏭️ Skipping duplicate hit (${timestamp - lastHit.timestamp}ms since last)`);
        return currentHits;
      }
      
      console.log(`✅ Bass hit #${currentHits.length + 1} recorded: ${(intensity * 100).toFixed(0)}%`);
      
      // Add new hit
      const newHit: BassHit = { timestamp, intensity };
      const updatedHits = [...currentHits, newHit];
      
      // Keep only recent hits (last 50)
      const trimmedHits = updatedHits.length > 50 ? updatedHits.slice(-50) : updatedHits;
      
      // Update patterns if we have enough hits
      if (trimmedHits.length >= fullConfig.patternWindowSize) {
        console.log(`🔍 Analyzing patterns... (${trimmedHits.length} hits collected)`);
        // Update patterns in a separate effect to avoid nested state updates
        setTimeout(() => {
          const foundPatterns = findPatterns(trimmedHits, fullConfig);
          setPatterns(foundPatterns);
          setIsLearning(false);
          if (foundPatterns.length > 0) {
            console.log(`📊 Found ${foundPatterns.length} patterns! Best confidence: ${(foundPatterns[0].confidence * 100).toFixed(0)}%`);
          }
        }, 0);
      } else {
        console.log(`📚 Learning... ${trimmedHits.length}/${fullConfig.patternWindowSize} hits collected`);
      }
      
      return trimmedHits;
    });
  }, [fullConfig]);
  
  /**
   * Find patterns in recent bass hits (pure function)
   * This doesn't need to be in useCallback since it's pure
   */
  function findPatterns(hits: BassHit[], config: BassPredictorConfig): BassPattern[] {
    if (hits.length < 4) return []; // Need at least 4 hits to find patterns
    
    const foundPatterns: BassPattern[] = [];
    
    // Calculate intervals between consecutive hits
    const intervals: number[] = [];
    for (let i = 1; i < hits.length; i++) {
      intervals.push(hits[i].timestamp - hits[i - 1].timestamp);
    }
    
    // Look for repeating patterns of different lengths (2-4 intervals)
    for (let patternLength = 2; patternLength <= Math.min(4, intervals.length / 2); patternLength++) {
      // Try different starting positions
      for (let start = 0; start <= intervals.length - patternLength * 2; start++) {
        const pattern = intervals.slice(start, start + patternLength);
        
        // Look for repetitions of this pattern
        let occurrences = 1;
        for (let i = start + patternLength; i <= intervals.length - patternLength; i++) {
          const candidate = intervals.slice(i, i + patternLength);
          
          // Check if candidate matches pattern (within tolerance)
          if (patternsMatch(pattern, candidate, fullConfig.patternToleranceMs)) {
            occurrences++;
          }
        }
        
        // If pattern occurs enough times, record it
        if (occurrences >= config.minPatternOccurrences) {
          const newPattern: BassPattern = {
            intervals: pattern,
            confidence: Math.min(1.0, occurrences / 3),
            occurrences,
            lastOccurrence: hits[hits.length - 1].timestamp,
          };
          
          // Check if similar pattern already exists
          const existingIndex = foundPatterns.findIndex(p =>
            patternsMatch(p.intervals, pattern, config.patternToleranceMs)
          );
          
          if (existingIndex >= 0) {
            // Update existing
            foundPatterns[existingIndex] = {
              ...foundPatterns[existingIndex],
              confidence: Math.max(foundPatterns[existingIndex].confidence, newPattern.confidence),
              occurrences: Math.max(foundPatterns[existingIndex].occurrences, newPattern.occurrences),
              lastOccurrence: newPattern.lastOccurrence,
            };
          } else {
            // Add new
            foundPatterns.push(newPattern);
          }
        }
      }
    }
    
    // Keep only top N patterns by confidence
    foundPatterns.sort((a, b) => b.confidence - a.confidence);
    return foundPatterns.slice(0, config.maxPatternsTracked);
  }
  
  /**
   * Check if two patterns match within tolerance
   */
  function patternsMatch(pattern1: number[], pattern2: number[], tolerance: number): boolean {
    if (pattern1.length !== pattern2.length) return false;
    
    for (let i = 0; i < pattern1.length; i++) {
      if (Math.abs(pattern1[i] - pattern2[i]) > tolerance) {
        return false;
      }
    }
    
    return true;
  }
  
  
  /**
   * Get prediction for next bass hit based on patterns
   */
  const getPrediction = useCallback((currentTime: number): BassPrediction | null => {
    if (patterns.length === 0 || recentHits.length === 0) {
      return null;
    }
    
    // Get the most confident pattern
    const bestPattern = patterns[0];
    if (!bestPattern) return null;
    
    // Calculate when the next hit should occur based on the pattern
    const lastHit = recentHits[recentHits.length - 1];
    
    // Find which interval in the pattern we're currently in
    const timeSinceLastHit = currentTime - lastHit.timestamp;
    let cumulativeTime = 0;
    let nextIntervalIndex = 0;
    
    for (let i = 0; i < bestPattern.intervals.length; i++) {
      cumulativeTime += bestPattern.intervals[i];
      if (timeSinceLastHit < cumulativeTime) {
        nextIntervalIndex = i;
        break;
      }
    }
    
    // Predict next hit
    const nextInterval = bestPattern.intervals[nextIntervalIndex] || bestPattern.intervals[0];
    const predictedTime = lastHit.timestamp + (nextIntervalIndex > 0 
      ? bestPattern.intervals.slice(0, nextIntervalIndex).reduce((sum, i) => sum + i, 0) + nextInterval
      : nextInterval);
    
    // Average intensity of recent hits as predicted intensity
    const avgIntensity = recentHits.slice(-5).reduce((sum, hit) => sum + hit.intensity, 0) / 
                        Math.min(5, recentHits.length);
    
    return {
      timestamp: predictedTime,
      intensity: avgIntensity,
      confidence: bestPattern.confidence,
      pattern: bestPattern,
      leadTime: fullConfig.predictionLeadTime,
    };
  }, [fullConfig, patterns, recentHits]);
  
  /**
   * Check if we should trigger an early event (for HUE lights, etc.)
   * This accounts for latency by triggering ahead of the predicted hit
   */
  const shouldTriggerEarly = useCallback((currentTime: number): { trigger: boolean; prediction: BassPrediction | null } => {
    const prediction = getPrediction(currentTime);
    if (!prediction) {
      return { trigger: false, prediction: null };
    }
    
    // Trigger if we're within the lead time window before the predicted hit
    const timeUntilHit = prediction.timestamp - currentTime;
    const shouldTrigger = timeUntilHit > 0 && timeUntilHit <= prediction.leadTime;
    
    return { trigger: shouldTrigger, prediction: shouldTrigger ? prediction : null };
  }, [getPrediction]);
  
  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setRecentHits([]);
    setPatterns([]);
    setPrediction(null);
    setPredictions({ total: 0, correct: 0 });
    setIsLearning(true);
  }, []);
  
  // Calculate accuracy
  const accuracy = predictions.total === 0 
    ? 0 
    : predictions.correct / predictions.total;
  
  return {
    state: {
      recentHits,
      patterns,
      nextPrediction: prediction,
      accuracy,
      isLearning,
    },
    recordBassHit,
    getPrediction,
    reset,
    shouldTriggerEarly,
  };
}

