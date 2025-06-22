import React, { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useAnimationData } from './hooks/useAnimationData';
import { useAudioPlayback } from './hooks/useAudioPlayback';
import { useEyeBlinking } from './hooks/useEyeBlinking';
import { useEyeSaccades } from './hooks/useEyeSaccades';
// useEnvironment is not directly used by MetahumanModel, but by MetahumanScene
// import { useEnvironment } from './hooks/useEnvironment'; 

function MetahumanModel({ isPlaying, animationData, audioBuffer, emotions, setIsPlaying, modelUrl }) {
  const gltf = useGLTF(modelUrl);
  const { frames, emotionFrames, blendShapeNames } = useAnimationData(animationData, emotions);
  const { soundRef, startTimeRef } = useAudioPlayback(gltf.scene, audioBuffer, isPlaying, () => setIsPlaying(false));
  const { clock } = useThree();
  const { getBlinkValue } = useEyeBlinking(clock);
  
  // The isSpeaking state for useEyeSaccades will be determined within useFrame
  // and passed to getSaccadeValues if the hook is designed for it,
  // or the hook itself will be reactive to the isPlaying prop.
  // For now, let's pass the dynamic speaking state to getSaccadeValues.
  const { getSaccadeValues } = useEyeSaccades(clock, false); // Initial false, updated in useFrame


  // Log all available blend shape names from the model once
  useEffect(() => {
    if (gltf && gltf.scene) {
      let logged = false;
      gltf.scene.traverse((object) => {
        if (!logged && object.isSkinnedMesh && object.morphTargetDictionary) {
          console.log('Available Blend Shape Names in Model:', Object.keys(object.morphTargetDictionary));
          logged = true; 
        }
      });
    }
  }, [gltf]);

  useFrame(() => {
    const currentTime = clock.getElapsedTime();
    const autonomousBlinkValue = getBlinkValue(currentTime);
    
    const currentSpeakingState = isPlaying && soundRef.current && soundRef.current.isPlaying;
    // Pass currentSpeakingState to getSaccadeValues.
    // This requires useEyeSaccades's getSaccadeValues to accept it or for useEyeSaccades to be re-created (not ideal).
    // A better approach for useEyeSaccades would be to make it reactive to an isSpeaking prop.
    // For now, we'll assume getSaccadeValues can take the current speaking state or the hook is already reactive.
    // Let's modify useEyeSaccades to accept isSpeaking in getSaccadeValues for clarity.
    const { eyeInfluenceX, eyeInfluenceY } = getSaccadeValues(currentTime, currentSpeakingState);


    if (!frames.length || !isPlaying || !soundRef.current || !soundRef.current.isPlaying) {
      gltf.scene.traverse((obj) => {
        if (obj.isSkinnedMesh && obj.morphTargetDictionary && obj.morphTargetInfluences) {
          const eyesClosedIndex = obj.morphTargetDictionary['eyesClosed'];
          if (eyesClosedIndex !== undefined) {
            obj.morphTargetInfluences[eyesClosedIndex] = autonomousBlinkValue;
          }

          const eyesLookUpIndex = obj.morphTargetDictionary['eyesLookUp'];
          const eyesLookDownIndex = obj.morphTargetDictionary['eyesLookDown'];
          const eyeLookOutLeftIndex = obj.morphTargetDictionary['eyeLookOutLeft'];
          const eyeLookInLeftIndex = obj.morphTargetDictionary['eyeLookInLeft'];
          const eyeLookOutRightIndex = obj.morphTargetDictionary['eyeLookOutRight'];
          const eyeLookInRightIndex = obj.morphTargetDictionary['eyeLookInRight'];

          if (eyesLookUpIndex !== undefined) obj.morphTargetInfluences[eyesLookUpIndex] = Math.max(0, eyeInfluenceY);
          if (eyesLookDownIndex !== undefined) obj.morphTargetInfluences[eyesLookDownIndex] = Math.max(0, -eyeInfluenceY);

          if (eyeInfluenceX > 0) { 
            if (eyeLookInLeftIndex !== undefined) obj.morphTargetInfluences[eyeLookInLeftIndex] = eyeInfluenceX;
            if (eyeLookOutRightIndex !== undefined) obj.morphTargetInfluences[eyeLookOutRightIndex] = eyeInfluenceX;
            if (eyeLookOutLeftIndex !== undefined) obj.morphTargetInfluences[eyeLookOutLeftIndex] = 0;
            if (eyeLookInRightIndex !== undefined) obj.morphTargetInfluences[eyeLookInRightIndex] = 0;
          } else { 
            if (eyeLookOutLeftIndex !== undefined) obj.morphTargetInfluences[eyeLookOutLeftIndex] = -eyeInfluenceX;
            if (eyeLookInRightIndex !== undefined) obj.morphTargetInfluences[eyeLookInRightIndex] = -eyeInfluenceX;
            if (eyeLookInLeftIndex !== undefined) obj.morphTargetInfluences[eyeLookInLeftIndex] = 0;
            if (eyeLookOutRightIndex !== undefined) obj.morphTargetInfluences[eyeLookOutRightIndex] = 0;
          }
        }
      });
      return;
    }

    const elapsed = soundRef.current.context.currentTime - (startTimeRef.current ?? 0);
    const fps = 30; 
    const frameIndex = Math.floor(elapsed * fps);

    if (frameIndex >= frames.length || frameIndex < 0) {
      if (isPlaying && !soundRef.current.isPlaying) { // Check if it was playing but sound finished
        setIsPlaying(false);
      }
      return;
    }

    const facialWeights = frames[frameIndex];
    const emotionWeights = emotionFrames[frameIndex] || {};

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
          const mainAnimEyesClosed = obj.morphTargetInfluences[eyesClosedIndex] || 0; 
          obj.morphTargetInfluences[eyesClosedIndex] = Math.max(mainAnimEyesClosed, autonomousBlinkValue);
        }
        
        // 2.5 Apply Eye Saccades
        const eyesLookUpIndex = obj.morphTargetDictionary['eyesLookUp'];
        const eyesLookDownIndex = obj.morphTargetDictionary['eyesLookDown'];
        const eyeLookOutLeftIndex = obj.morphTargetDictionary['eyeLookOutLeft'];
        const eyeLookInLeftIndex = obj.morphTargetDictionary['eyeLookInLeft'];
        const eyeLookOutRightIndex = obj.morphTargetDictionary['eyeLookOutRight'];
        const eyeLookInRightIndex = obj.morphTargetDictionary['eyeLookInRight'];
        
        if (eyesLookUpIndex !== undefined) obj.morphTargetInfluences[eyesLookUpIndex] = Math.max(0, eyeInfluenceY);
        if (eyesLookDownIndex !== undefined) obj.morphTargetInfluences[eyesLookDownIndex] = Math.max(0, -eyeInfluenceY);

        if (eyeInfluenceX > 0) { 
            if (eyeLookInLeftIndex !== undefined) obj.morphTargetInfluences[eyeLookInLeftIndex] = eyeInfluenceX;
            if (eyeLookOutRightIndex !== undefined) obj.morphTargetInfluences[eyeLookOutRightIndex] = eyeInfluenceX;
            if (eyeLookOutLeftIndex !== undefined) obj.morphTargetInfluences[eyeLookOutLeftIndex] = 0;
            if (eyeLookInRightIndex !== undefined) obj.morphTargetInfluences[eyeLookInRightIndex] = 0;
        } else { 
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
            obj.morphTargetInfluences[morphIndex] = (obj.morphTargetInfluences[morphIndex] || 0) + (emotionWeights[emotionName] ?? 0);
            obj.morphTargetInfluences[morphIndex] = Math.max(0, Math.min(1, obj.morphTargetInfluences[morphIndex]));
          }
        });
      }
    });
  }); // End of useFrame

  return <primitive object={gltf.scene} />;
}

export default MetahumanModel;
