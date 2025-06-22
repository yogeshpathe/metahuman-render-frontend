import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';

// Blink parameters (can be adjusted or passed as props)
const BLINK_INTERVAL_MIN = 2.0; // seconds between blinks (minimum)
const BLINK_INTERVAL_MAX = 7.0; // seconds between blinks (maximum)
const BLINK_DURATION = 0.15;    // seconds for how long a blink lasts
const BLINK_STRENGTH = 1.0;     // Blink intensity (0 to 1)

export function useEyeBlinking(clock) {
  const nextBlinkTimeRef = useRef(0);
  const isCurrentlyBlinkingRef = useRef(false);
  const blinkEndTimeRef = useRef(0);

  // Initialize nextBlinkTime on mount
  useEffect(() => {
    if (clock) {
      const now = clock.getElapsedTime();
      nextBlinkTimeRef.current = now + BLINK_INTERVAL_MIN + Math.random() * (BLINK_INTERVAL_MAX - BLINK_INTERVAL_MIN);
    }
  }, [clock]);

  const getBlinkValue = (currentTime) => {
    let autonomousBlinkValue = 0;

    if (isCurrentlyBlinkingRef.current) {
      if (currentTime < blinkEndTimeRef.current) {
        const blinkProgress = (currentTime - (blinkEndTimeRef.current - BLINK_DURATION)) / BLINK_DURATION; // 0 to 1
        autonomousBlinkValue = BLINK_STRENGTH * Math.sin(blinkProgress * Math.PI); // Sine wave for smooth blink
      } else {
        // Blink ended
        isCurrentlyBlinkingRef.current = false;
        // autonomousBlinkValue remains 0
        nextBlinkTimeRef.current = currentTime + BLINK_INTERVAL_MIN + Math.random() * (BLINK_INTERVAL_MAX - BLINK_INTERVAL_MIN);
      }
    } else if (currentTime >= nextBlinkTimeRef.current) {
      // Time to blink
      isCurrentlyBlinkingRef.current = true;
      blinkEndTimeRef.current = currentTime + BLINK_DURATION;
      // autonomousBlinkValue will be calculated in the next frame's active blink phase (or remains 0 for this frame if blink just started)
    }
    // If not blinking and not time to start, autonomousBlinkValue remains 0.
    return autonomousBlinkValue;
  };

  return { getBlinkValue };
}
