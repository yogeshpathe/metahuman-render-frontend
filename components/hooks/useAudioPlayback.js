import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function useAudioPlayback(gltfScene, audioBuffer, isPlaying, onPlaybackEnd) {
  const soundRef = useRef(null);
  const listenerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Setup audio listener and audio buffer
  useEffect(() => {
    if (!audioBuffer || !gltfScene) return;

    if (!listenerRef.current) {
      const listener = new THREE.AudioListener();
      listenerRef.current = listener;
      gltfScene.add(listener); // Add listener to the GLTF scene
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
    console.log('Audio buffer set for playback hook');

    // If isPlaying is already true, start playback immediately
    if (isPlaying) {
      sound.play();
      startTimeRef.current = sound.context.currentTime;
    }
    
    // Handle playback end
    const onEnded = () => {
        if (onPlaybackEnd) {
            onPlaybackEnd();
        }
    };
    sound.onEnded = onEnded;


    return () => {
      if (soundRef.current) {
        soundRef.current.onEnded = null; // Clean up event listener
        if (soundRef.current.isPlaying) {
          soundRef.current.stop();
        }
      }
      if (listenerRef.current && gltfScene) {
        // gltfScene.remove(listenerRef.current); // Optional: remove listener if scene is disposed
        // listenerRef.current = null;
      }
    };
  }, [gltfScene, audioBuffer, onPlaybackEnd]); // isPlaying removed from here, handled in next effect

  // Play or stop audio on isPlaying change
  useEffect(() => {
    if (!soundRef.current || !audioBuffer) return;

    if (isPlaying) {
      if (!soundRef.current.isPlaying) {
        soundRef.current.play();
        // Adjust start time if resuming, or reset if starting fresh
        // For simplicity, if it was paused, it resumes. If stopped and played again, it restarts.
        // The current setup implies it restarts if isPlaying becomes true after being false.
        startTimeRef.current = soundRef.current.context.currentTime - (soundRef.current.offset || 0);
        console.log('Audio playing via hook');
      }
    } else {
      if (soundRef.current.isPlaying) {
        soundRef.current.pause(); // Use pause to allow resume
        console.log('Audio paused via hook');
      }
    }
  }, [isPlaying, audioBuffer]); // audioBuffer dependency ensures soundRef is ready

  return { soundRef, startTimeRef };
}
