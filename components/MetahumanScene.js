import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment } from '@react-three/drei';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

const hdrPath = '/textures/royal_esplanade_1k.hdr';

function MetahumanScene({ isPlaying, animationData, audioBuffer, emotions, setIsPlaying }) {
  const gltf = useGLTF('/output/human_character.glb');
  const [frames, setFrames] = useState([]);
  const [emotionFrames, setEmotionFrames] = useState([]); // Add state for emotion frames
  const [blendShapeNames, setBlendShapeNames] = useState([]);
  const soundRef = useRef(null);
  const listenerRef = useRef(null);
  const startTimeRef = useRef(null);
  const { scene, clock } = useThree(); // Added clock here

  // Log all available blend shape names from the model once
  useEffect(() => {
    if (gltf && gltf.scene) {
      let logged = false;
      gltf.scene.traverse((object) => {
        if (!logged && object.isSkinnedMesh && object.morphTargetDictionary) {
          console.log('Available Blend Shape Names in Model:', Object.keys(object.morphTargetDictionary));
          logged = true; // Log only for the first skinned mesh with morph targets
        }
      });
    }
  }, [gltf]);

  // Refs for blink state
  const nextBlinkTimeRef = useRef(0);
  const isCurrentlyBlinkingRef = useRef(false);
  const blinkEndTimeRef = useRef(0);

  // Refs for eye saccades
  const nextSaccadeTimeRef = useRef(0);
  const currentEyeTargetXRef = useRef(0);
  const currentEyeTargetYRef = useRef(0);
  const saccadeStartTimeRef = useRef(0);
  const previousEyeTargetXRef = useRef(0);
  const previousEyeTargetYRef = useRef(0);
  const currentSaccadeDurationRef = useRef(0.1); // For variable saccade duration

  // Blink parameters (can be adjusted)
  const BLINK_INTERVAL_MIN = 2.0; // seconds between blinks (minimum)
  const BLINK_INTERVAL_MAX = 7.0; // seconds between blinks (maximum)
  const BLINK_DURATION = 0.15;    // seconds for how long a blink lasts
  const BLINK_STRENGTH = 1.0;     // Blink intensity (0 to 1)

  // Eye Saccade Parameters
  const SACCADE_INTERVAL_MIN = 0.8; // Min time between saccades (slightly increased)
  const SACCADE_INTERVAL_MAX = 5.0; // Max time between saccades (slightly increased)
  const SACCADE_DURATION_MIN = 0.08; // Min duration for a saccade
  const SACCADE_DURATION_MAX = 0.2;  // Max duration for a saccade
  const EYE_MOVEMENT_RANGE_X = 0.7; // Max horizontal movement (slightly reduced for subtlety)
  const EYE_MOVEMENT_RANGE_Y = 0.5; // Max vertical movement (slightly reduced for subtlety)
  const EYE_TARGET_CENTER_BIAS = 0.4; // (0-1) Higher = more bias to center. 0 = uniform.

  // Load HDR environment
  useEffect(() => {
    new RGBELoader().load(hdrPath, (hdrTexture) => {
      hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = hdrTexture;
      scene.background = hdrTexture;
    });
  }, [scene]);

  // Process animation data from API
  useEffect(() => {
    if (animationData && animationData.length > 0) {
      // Get the original PascalCase names from the API response
      const apiBlendShapeNames = Object.keys(animationData[0].blendShapes);

      // Create the frame data (weights) based on the original name order
      const frameData = animationData.map(frame =>
        apiBlendShapeNames.map(name => frame.blendShapes[name])
      );
      
      // ✅ **FIX: Normalize the names to camelCase to match the GLTF model**
      const normalizedNames = apiBlendShapeNames.map(name => 
        name.charAt(0).toLowerCase() + name.slice(1)
      );

      setBlendShapeNames(normalizedNames); // Use the corrected names
      setFrames(frameData);
      
      console.log('Loaded frames from API:', frameData.length, 'blend shapes:', normalizedNames.length);
    }
  }, [animationData]);

  // Process emotion data
  useEffect(() => {
    if (emotions && emotions.length > 0) {
      setEmotionFrames(emotions.map(frame => frame.emotion_values));
      console.log('Loaded emotion frames:', emotions.length);
    }
  }, [emotions]);

  // Setup audio listener and audio buffer
  useEffect(() => {
    if (!audioBuffer) return;

    if (!listenerRef.current) {
      const listener = new THREE.AudioListener();
      listenerRef.current = listener;
      gltf.scene.add(listener);
    }

    // Stop and clear any existing sound
    if (soundRef.current) {
        if (soundRef.current.isPlaying) {
            soundRef.current.stop();
        }
        soundRef.current.setBuffer(null); 
    }

    const sound = new THREE.Audio(listenerRef.current);
    sound.setBuffer(audioBuffer);
    sound.setLoop(false);
    sound.setVolume(1.0);
    soundRef.current = sound;
    console.log('Audio buffer set from API');
    
    // If isPlaying is already true, start playback immediately
    if(isPlaying) {
        sound.play();
        startTimeRef.current = sound.context.currentTime;
    }

    return () => {
      if (soundRef.current && soundRef.current.isPlaying) {
        soundRef.current.stop();
      }
    };
  }, [gltf.scene, audioBuffer]);

  // Play or stop audio on isPlaying change
  useEffect(() => {
    if (!soundRef.current || !audioBuffer) return;

    if (isPlaying) {
      if (!soundRef.current.isPlaying) {
        // Use play() which resumes from where it was paused, or starts from beginning
        soundRef.current.play();
        // If we are resuming, we should not reset the start time.
        // A simple way to manage this is to track offset.
        // For this case, we'll just restart it for simplicity.
        startTimeRef.current = soundRef.current.context.currentTime - soundRef.current.offset;
        console.log('Audio playing');
      }
    } else {
      if (soundRef.current.isPlaying) {
        soundRef.current.pause();
        console.log('Audio paused');
      }
    }
  }, [isPlaying, audioBuffer]);

  // Initialize nextBlinkTime on mount for eye blinking
  useEffect(() => {
    const now = clock.getElapsedTime();
    nextBlinkTimeRef.current = now + BLINK_INTERVAL_MIN + Math.random() * (BLINK_INTERVAL_MAX - BLINK_INTERVAL_MIN);
    
    // Initialize Saccade timers and states
    saccadeStartTimeRef.current = now; 
    previousEyeTargetXRef.current = 0; 
    previousEyeTargetYRef.current = 0;
    currentEyeTargetXRef.current = 0; 
    currentEyeTargetYRef.current = 0;
    nextSaccadeTimeRef.current = now + SACCADE_INTERVAL_MIN + Math.random() * (SACCADE_INTERVAL_MAX - SACCADE_INTERVAL_MIN);
  }, [clock]); // Add clock to dependency array

  useFrame(() => {
    const currentTime = clock.getElapsedTime();
    let autonomousBlinkValue = 0;
    // Variables for calculated saccade values
    let calculatedEyeInfluenceX = 0;
    let calculatedEyeInfluenceY = 0;

    // --- Autonomous Eye Saccades Calculation ---
    // This section calculates the potential eye movement if saccades were to occur.
    if (currentTime >= nextSaccadeTimeRef.current) {
      previousEyeTargetXRef.current = currentEyeTargetXRef.current;
      previousEyeTargetYRef.current = currentEyeTargetYRef.current;

      // Generate target with center bias
      let targetX = (Math.random() * 2 - 1); // -1 to 1
      let targetY = (Math.random() * 2 - 1); // -1 to 1
      // Apply center bias
      targetX *= (1 - EYE_TARGET_CENTER_BIAS);
      targetY *= (1 - EYE_TARGET_CENTER_BIAS);

      currentEyeTargetXRef.current = targetX * EYE_MOVEMENT_RANGE_X;
      currentEyeTargetYRef.current = targetY * EYE_MOVEMENT_RANGE_Y;
      
      currentSaccadeDurationRef.current = SACCADE_DURATION_MIN + Math.random() * (SACCADE_DURATION_MAX - SACCADE_DURATION_MIN);
      saccadeStartTimeRef.current = currentTime;
      nextSaccadeTimeRef.current = currentTime + currentSaccadeDurationRef.current + SACCADE_INTERVAL_MIN + Math.random() * (SACCADE_INTERVAL_MAX - SACCADE_INTERVAL_MIN);
    }

    // Interpolate eye movement during saccade
    const saccadeDuration = currentSaccadeDurationRef.current;
    if (currentTime < saccadeStartTimeRef.current + saccadeDuration) {
      let saccadeProgress = (currentTime - saccadeStartTimeRef.current) / saccadeDuration; // 0 to 1
      // Apply ease-in-out (sine)
      saccadeProgress = 0.5 * (1 - Math.cos(saccadeProgress * Math.PI));
      
      calculatedEyeInfluenceX = previousEyeTargetXRef.current + (currentEyeTargetXRef.current - previousEyeTargetXRef.current) * saccadeProgress;
      calculatedEyeInfluenceY = previousEyeTargetYRef.current + (currentEyeTargetYRef.current - previousEyeTargetYRef.current) * saccadeProgress;
    } else {
      // Hold eye position after saccade
      calculatedEyeInfluenceX = currentEyeTargetXRef.current;
      calculatedEyeInfluenceY = currentEyeTargetYRef.current;
    }

    // Determine final eye influence based on speaking state
    const isCurrentlySpeaking = isPlaying && soundRef.current && soundRef.current.isPlaying;
    const eyeInfluenceX = isCurrentlySpeaking ? 0 : calculatedEyeInfluenceX;
    const eyeInfluenceY = isCurrentlySpeaking ? 0 : calculatedEyeInfluenceY;


    // --- Autonomous Blinking ---
    if (isCurrentlyBlinkingRef.current) {
      if (currentTime < blinkEndTimeRef.current) {
        const blinkProgress = (currentTime - (blinkEndTimeRef.current - BLINK_DURATION)) / BLINK_DURATION; // 0 to 1
        autonomousBlinkValue = BLINK_STRENGTH * Math.sin(blinkProgress * Math.PI);
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

    // Animation logic (lip-sync and emotions)
    if (!frames.length || !isPlaying || !soundRef.current || !soundRef.current.isPlaying) {
      // If not playing, we could still allow blinks if desired by moving blink logic
      // outside this isPlaying check. For now, blinks only happen during playback.
      // However, we should ensure eyes are reset if not playing.
      gltf.scene.traverse((obj) => {
        if (obj.isSkinnedMesh && obj.morphTargetDictionary && obj.morphTargetInfluences) {
            // Apply blinking
            const eyesClosedIndex = obj.morphTargetDictionary['eyesClosed'];
            if (eyesClosedIndex !== undefined) {
                obj.morphTargetInfluences[eyesClosedIndex] = autonomousBlinkValue;
            }

            // Apply eye saccades (even when paused/not playing audio)
            const eyesLookUpIndex = obj.morphTargetDictionary['eyesLookUp'];
            const eyesLookDownIndex = obj.morphTargetDictionary['eyesLookDown'];
            const eyeLookOutLeftIndex = obj.morphTargetDictionary['eyeLookOutLeft'];
            const eyeLookInLeftIndex = obj.morphTargetDictionary['eyeLookInLeft'];
            const eyeLookOutRightIndex = obj.morphTargetDictionary['eyeLookOutRight'];
            const eyeLookInRightIndex = obj.morphTargetDictionary['eyeLookInRight'];

            // Vertical
            if (eyesLookUpIndex !== undefined) obj.morphTargetInfluences[eyesLookUpIndex] = Math.max(0, eyeInfluenceY);
            if (eyesLookDownIndex !== undefined) obj.morphTargetInfluences[eyesLookDownIndex] = Math.max(0, -eyeInfluenceY);

            // Horizontal
            if (eyeInfluenceX > 0) { // Looking Right
                if (eyeLookInLeftIndex !== undefined) obj.morphTargetInfluences[eyeLookInLeftIndex] = eyeInfluenceX;
                if (eyeLookOutRightIndex !== undefined) obj.morphTargetInfluences[eyeLookOutRightIndex] = eyeInfluenceX;
                // Ensure opposite direction is zeroed out
                if (eyeLookOutLeftIndex !== undefined) obj.morphTargetInfluences[eyeLookOutLeftIndex] = 0;
                if (eyeLookInRightIndex !== undefined) obj.morphTargetInfluences[eyeLookInRightIndex] = 0;
            } else { // Looking Left (or straight if eyeInfluenceX is 0)
                if (eyeLookOutLeftIndex !== undefined) obj.morphTargetInfluences[eyeLookOutLeftIndex] = -eyeInfluenceX;
                if (eyeLookInRightIndex !== undefined) obj.morphTargetInfluences[eyeLookInRightIndex] = -eyeInfluenceX;
                // Ensure opposite direction is zeroed out
                if (eyeLookInLeftIndex !== undefined) obj.morphTargetInfluences[eyeLookInLeftIndex] = 0;
                if (eyeLookOutRightIndex !== undefined) obj.morphTargetInfluences[eyeLookOutRightIndex] = 0;
            }
        }
      });
      return;
    }

    const elapsed = soundRef.current.context.currentTime - (startTimeRef.current ?? 0);
    const fps = 30; // Assuming the animation is baked at 30 FPS
    const frameIndex = Math.floor(elapsed * fps);

    if (frameIndex >= frames.length || frameIndex < 0) {
      // If the animation is over, we can stop it
       if(isPlaying && !soundRef.current.isPlaying) {
            setIsPlaying(false);
       }
      return;
    }

    const facialWeights = frames[frameIndex];
    const emotionWeights = emotionFrames[frameIndex] || {}; // Get emotion weights for the current frame

    if (!facialWeights || facialWeights.length === 0) return;

    gltf.scene.traverse((obj) => {
      if (obj.isSkinnedMesh && obj.morphTargetDictionary && obj.morphTargetInfluences) {
        // 1. Apply base facial animation (lip-sync)
        blendShapeNames.forEach((name, i) => {
          const morphIndex = obj.morphTargetDictionary[name];
          if (morphIndex !== undefined) {
            obj.morphTargetInfluences[morphIndex] = facialWeights[i] ?? 0;
          }
        });

        // 2. Handle 'eyesClosed' by combining main animation and autonomous blink
        const eyesClosedIndex = obj.morphTargetDictionary['eyesClosed'];
        if (eyesClosedIndex !== undefined) {
          const mainAnimEyesClosed = obj.morphTargetInfluences[eyesClosedIndex] || 0; // Value from facialWeights
          obj.morphTargetInfluences[eyesClosedIndex] = Math.max(mainAnimEyesClosed, autonomousBlinkValue);
        }
        
        // 2.5 Apply Eye Saccades (combined with any animation driven eye movement if necessary)
        // For now, autonomous saccades will override animation-driven eye looks if they exist on same blendshapes.
        // A more advanced setup might blend them or prioritize.
        const eyesLookUpIndex = obj.morphTargetDictionary['eyesLookUp'];
        const eyesLookDownIndex = obj.morphTargetDictionary['eyesLookDown'];
        const eyeLookOutLeftIndex = obj.morphTargetDictionary['eyeLookOutLeft'];
        const eyeLookInLeftIndex = obj.morphTargetDictionary['eyeLookInLeft'];
        const eyeLookOutRightIndex = obj.morphTargetDictionary['eyeLookOutRight'];
        const eyeLookInRightIndex = obj.morphTargetDictionary['eyeLookInRight'];
        
        // Vertical - Assuming facialWeights don't control these directly for saccades.
        // If they do, this will override. For simplicity, saccades take precedence.
        if (eyesLookUpIndex !== undefined) obj.morphTargetInfluences[eyesLookUpIndex] = Math.max(0, eyeInfluenceY);
        if (eyesLookDownIndex !== undefined) obj.morphTargetInfluences[eyesLookDownIndex] = Math.max(0, -eyeInfluenceY);

        // Horizontal - Assuming facialWeights don't control these directly for saccades.
        if (eyeInfluenceX > 0) { // Looking Right
            if (eyeLookInLeftIndex !== undefined) obj.morphTargetInfluences[eyeLookInLeftIndex] = eyeInfluenceX;
            if (eyeLookOutRightIndex !== undefined) obj.morphTargetInfluences[eyeLookOutRightIndex] = eyeInfluenceX;
            if (eyeLookOutLeftIndex !== undefined) obj.morphTargetInfluences[eyeLookOutLeftIndex] = 0;
            if (eyeLookInRightIndex !== undefined) obj.morphTargetInfluences[eyeLookInRightIndex] = 0;
        } else { // Looking Left
            if (eyeLookOutLeftIndex !== undefined) obj.morphTargetInfluences[eyeLookOutLeftIndex] = -eyeInfluenceX;
            if (eyeLookInRightIndex !== undefined) obj.morphTargetInfluences[eyeLookInRightIndex] = -eyeInfluenceX;
            if (eyeLookInLeftIndex !== undefined) obj.morphTargetInfluences[eyeLookInLeftIndex] = 0;
            if (eyeLookOutRightIndex !== undefined) obj.morphTargetInfluences[eyeLookOutRightIndex] = 0;
        }

        // 3. Apply emotions additively
        Object.keys(emotionWeights).forEach(emotionName => {
          let morphTargetName = emotionName;
          if (obj.morphTargetDictionary[morphTargetName] === undefined && obj.morphTargetDictionary[`emotion_${emotionName}`] !== undefined) {
            morphTargetName = `emotion_${emotionName}`;
          }

          const morphIndex = obj.morphTargetDictionary[morphTargetName];
          if (morphIndex !== undefined) {
            // Add emotion influence to the current value (which includes facial anim and blink for eyesClosed)
            obj.morphTargetInfluences[morphIndex] = (obj.morphTargetInfluences[morphIndex] || 0) + (emotionWeights[emotionName] ?? 0);
            // Clamp final influence
            obj.morphTargetInfluences[morphIndex] = Math.max(0, Math.min(1, obj.morphTargetInfluences[morphIndex]));
          }
        });
      }
    });
  });

  return (
    <group position={[0, -1.4, 0]} rotation={[0, 0, 0]} >
      <primitive object={gltf.scene} />
    </group>
  );
}

export default MetahumanScene;
