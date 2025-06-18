import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment } from '@react-three/drei';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

const hdrPath = '/textures/royal_esplanade_1k.hdr';

function MetahumanScene({ isPlaying, animationData, audioBuffer, setIsPlaying }) {
  const gltf = useGLTF('/output/mark_with_tongue.glb');
  const [frames, setFrames] = useState([]);
  const [blendShapeNames, setBlendShapeNames] = useState([]);
  const soundRef = useRef(null);
  const listenerRef = useRef(null);
  const startTimeRef = useRef(null);
  const { scene } = useThree();

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

  useFrame(() => {
    if (!frames.length || !isPlaying || !soundRef.current || !soundRef.current.isPlaying) return;

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

    const weights = frames[frameIndex];
    if (!weights || weights.length === 0) return;
    
    gltf.scene.traverse((obj) => {
      if (obj.isSkinnedMesh && obj.morphTargetDictionary && obj.morphTargetInfluences) {
        // The `blendShapeNames` are now correctly in camelCase
        blendShapeNames.forEach((name, i) => {
          const morphIndex = obj.morphTargetDictionary[name];
          if (morphIndex !== undefined) {
            obj.morphTargetInfluences[morphIndex] = weights[i] ?? 0;
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
