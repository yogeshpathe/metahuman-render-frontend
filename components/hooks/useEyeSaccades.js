import { useRef, useEffect } from 'react';

// Eye Saccade Parameters (can be adjusted or passed as props)
const SACCADE_INTERVAL_MIN = 0.8; 
const SACCADE_INTERVAL_MAX = 5.0; 
const SACCADE_DURATION_MIN = 0.08;
const SACCADE_DURATION_MAX = 0.2; 
const EYE_MOVEMENT_RANGE_X = 0.7;
const EYE_MOVEMENT_RANGE_Y = 0.5;
const EYE_TARGET_CENTER_BIAS = 0.4; // (0-1) Higher = more bias to center. 0 = uniform.

export function useEyeSaccades(clock, isSpeaking) {
  const nextSaccadeTimeRef = useRef(0);
  const currentEyeTargetXRef = useRef(0);
  const currentEyeTargetYRef = useRef(0);
  const saccadeStartTimeRef = useRef(0);
  const previousEyeTargetXRef = useRef(0);
  const previousEyeTargetYRef = useRef(0);
  const currentSaccadeDurationRef = useRef(0.1);

  // Initialize Saccade timers and states
  useEffect(() => {
    if (clock) {
      const now = clock.getElapsedTime();
      saccadeStartTimeRef.current = now;
      previousEyeTargetXRef.current = 0;
      previousEyeTargetYRef.current = 0;
      currentEyeTargetXRef.current = 0;
      currentEyeTargetYRef.current = 0;
      nextSaccadeTimeRef.current = now + SACCADE_INTERVAL_MIN + Math.random() * (SACCADE_INTERVAL_MAX - SACCADE_INTERVAL_MIN);
    }
  }, [clock]);

  // Modified to accept isSpeaking dynamically
  const getSaccadeValues = (currentTime, currentIsSpeaking) => { 
    let calculatedEyeInfluenceX = 0;
    let calculatedEyeInfluenceY = 0;

    if (currentTime >= nextSaccadeTimeRef.current) {
      previousEyeTargetXRef.current = currentEyeTargetXRef.current;
      previousEyeTargetYRef.current = currentEyeTargetYRef.current;

      let targetX = (Math.random() * 2 - 1); // -1 to 1
      let targetY = (Math.random() * 2 - 1); // -1 to 1
      targetX *= (1 - EYE_TARGET_CENTER_BIAS);
      targetY *= (1 - EYE_TARGET_CENTER_BIAS);

      currentEyeTargetXRef.current = targetX * EYE_MOVEMENT_RANGE_X;
      currentEyeTargetYRef.current = targetY * EYE_MOVEMENT_RANGE_Y;
      
      currentSaccadeDurationRef.current = SACCADE_DURATION_MIN + Math.random() * (SACCADE_DURATION_MAX - SACCADE_DURATION_MIN);
      saccadeStartTimeRef.current = currentTime;
      nextSaccadeTimeRef.current = currentTime + currentSaccadeDurationRef.current + SACCADE_INTERVAL_MIN + Math.random() * (SACCADE_INTERVAL_MAX - SACCADE_INTERVAL_MIN);
    }

    const saccadeDuration = currentSaccadeDurationRef.current;
    if (currentTime < saccadeStartTimeRef.current + saccadeDuration) {
      let saccadeProgress = (currentTime - saccadeStartTimeRef.current) / saccadeDuration; // 0 to 1
      saccadeProgress = 0.5 * (1 - Math.cos(saccadeProgress * Math.PI)); // Ease-in-out
      
      calculatedEyeInfluenceX = previousEyeTargetXRef.current + (currentEyeTargetXRef.current - previousEyeTargetXRef.current) * saccadeProgress;
      calculatedEyeInfluenceY = previousEyeTargetYRef.current + (currentEyeTargetYRef.current - previousEyeTargetYRef.current) * saccadeProgress;
    } else {
      calculatedEyeInfluenceX = currentEyeTargetXRef.current;
      calculatedEyeInfluenceY = currentEyeTargetYRef.current;
    }

    // Use the dynamically passed currentIsSpeaking state
    const eyeInfluenceX = currentIsSpeaking ? 0 : calculatedEyeInfluenceX;
    const eyeInfluenceY = currentIsSpeaking ? 0 : calculatedEyeInfluenceY;

    return { eyeInfluenceX, eyeInfluenceY };
  };

  return { getSaccadeValues };
}
