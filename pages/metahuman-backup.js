'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';

function MetahumanScene({ isPlaying }) {
  const gltf = useGLTF('/output/human_character.glb');
  const [frames, setFrames] = useState([]);
  const [blendShapeNames, setBlendShapeNames] = useState([]);
  const soundRef = useRef(null);
  const listenerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Load animation frames from CSV
  useEffect(() => {
    fetch('/output/animation_frames.csv')
      .then((res) => res.text())
      .then((text) => {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').slice(2).map(h => h.trim());
        const data = lines.slice(1).map(line =>
          line.split(',').slice(2).map(parseFloat)
        );
        setBlendShapeNames(headers);
        setFrames(data);
        console.log('Loaded frames:', data.length, 'blend shapes:', headers.length);
      })
      .catch((e) => console.error('Failed to load animation frames:', e));
  }, []);

  // Setup audio listener and audio buffer
  useEffect(() => {
    if (!listenerRef.current) {
      const listener = new THREE.AudioListener();
      listenerRef.current = listener;
      gltf.scene.add(listener);
    }

    const sound = new THREE.Audio(listenerRef.current);
    const audioLoader = new THREE.AudioLoader();

    audioLoader.load('/output/out.wav',
      (buffer) => {
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(1.0);
        soundRef.current = sound;
        console.log('Audio loaded');

        if (isPlaying) {
          sound.play();
          startTimeRef.current = sound.context.currentTime;
        }
      },
      undefined,
      (err) => console.error('Audio load error:', err)
    );

    return () => {
      if (soundRef.current && soundRef.current.isPlaying) {
        soundRef.current.stop();
        startTimeRef.current = null;
      }
    };
  }, [gltf.scene, isPlaying]);

  // Play or stop audio on isPlaying change
  useEffect(() => {
    if (!soundRef.current) return;
    if (isPlaying) {
      if (!soundRef.current.isPlaying) {
        soundRef.current.play();
        startTimeRef.current = soundRef.current.context.currentTime;
        console.log('Audio started');
      }
    } else {
      if (soundRef.current.isPlaying) {
        soundRef.current.pause();
        console.log('Audio paused');
      }
    }
  }, [isPlaying]);

  useFrame(() => {
    if (!frames.length || !isPlaying || !soundRef.current || !soundRef.current.isPlaying) return;

    // Calculate elapsed time since audio started playing
    const elapsed = soundRef.current.context.currentTime - (startTimeRef.current ?? 0);
    const fps = 30;
    const frameIndex = Math.floor(elapsed * fps) % frames.length;

    const weights = frames[frameIndex];
    if (!weights || weights.length === 0) return;

    gltf.scene.traverse((obj) => {
      if (obj.isSkinnedMesh && obj.morphTargetDictionary && obj.morphTargetInfluences) {
        blendShapeNames.forEach((csvName, i) => {
          // Clean CSV name to match morphTargetDictionary keys exactly (case-sensitive)
          // Your morph target dictionary keys are camelCase without 'blendShapes.' prefix
          const cleanName = csvName.replace('blendShapes.', '').trim();
          const normalizedName = cleanName.charAt(0).toLowerCase() + cleanName.slice(1);

          const morphIndex = obj.morphTargetDictionary[normalizedName];
          if (morphIndex !== undefined) {
            obj.morphTargetInfluences[morphIndex] = weights[i] ?? 0;
          } else {
            // Optionally uncomment to debug unmapped blendshapes:
            // console.warn(`Blendshape '${normalizedName}' not found in morphTargetDictionary`);
          }
        });
      }
    });
  });

  return <primitive object={gltf.scene} />;
}

export default function MetahumanPage() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsPlaying((p) => !p)}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 10,
          padding: '8px 16px',
          fontSize: '16px',
        }}
      >
        {isPlaying ? 'Pause Animation' : 'Play Animation'}
      </button>
      <div style={{ height: '100vh', width: '100vw' }}>
        <Canvas camera={{ position: [0, 0.2, 1.8], fov: 35 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]}  intensity={0.8}/>
          <MetahumanScene isPlaying={isPlaying} />
          <OrbitControls />
        </Canvas>
      </div>
    </>
  );
}
