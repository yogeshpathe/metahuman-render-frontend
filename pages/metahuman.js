'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, useProgress, Html } from '@react-three/drei';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

const hdrPath = '/textures/royal_esplanade_1k.hdr';

function MetahumanScene({ isPlaying, animationData, audioBuffer }) {
  const gltf = useGLTF('/output/human_character.glb');
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

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div style={{ color: 'white' }}>Loading: {progress.toFixed(0)}%</div>
    </Html>
  );
}

function Controls() {
  const { camera, gl } = useThree();
  const controls = useRef();

  useEffect(() => {
    if (controls.current) {
      controls.current.target.set(0, 0.2, 0); // <-- Set focus around face height
      controls.current.update();
    }
  }, []);

  return <OrbitControls ref={controls} args={[camera, gl.domElement]} enableZoom={false} />;
}


export default function MetahumanPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [animationData, setAnimationData] = useState(null);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateAnimation = async () => {
    if (!prompt) return;

    setIsLoading(true);

    try {
      // 1. Fetch the config file
      const configFileRes = await fetch('/config/config_mark.yml');
      const configFileBlob = await configFileRes.blob();
      const configFile = new File([configFileBlob], 'config_mark.yml', { type: 'text/yaml' });

      // 2. Prepare form data
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('config_file', configFile);

      // 3. Call the API
      const response = await fetch('http://localhost:8000/inference-from-prompt', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      if (data.status.code === 'SUCCESS') {
        // 4. Decode base64 audio and create an AudioBuffer
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const decodedAudio = atob(data.output_audio_wav_base64);
        const audioBytes = new Uint8Array(decodedAudio.length);
        for (let i = 0; i < decodedAudio.length; i++) {
          audioBytes[i] = decodedAudio.charCodeAt(i);
        }
        const audioBuffer = await audioContext.decodeAudioData(audioBytes.buffer);
        setAudioBuffer(audioBuffer);

        // 5. Set animation frames
        setAnimationData(data.animation_frames);

        // 6. Automatically start playing
        setIsPlaying(true);
      } else {
        console.error('API returned an error:', data.status.message);
      }

    } catch (error) {
      console.error('Failed to generate animation:', error);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <>
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        display: 'flex',
        gap: '10px'
      }}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here"
          style={{
            padding: '8px 12px',
            fontSize: '16px',
            width: '400px',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
          disabled={isLoading}
        />
        <button
          onClick={handleGenerateAnimation}
          disabled={isLoading || !prompt}
          style={{
            padding: '8px 16px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          {isLoading ? 'Generating...' : 'Generate Animation'}
        </button>
      </div>

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
        disabled={!animationData} // Disable until data is loaded
      >
        {isPlaying ? 'Pause Animation' : 'Play Animation'}
      </button>

      <div style={{ height: '100vh', width: '100vw' }}>
        <Canvas camera={{ position: [0, 0.2, 1.8], fov: 35 }}>
          <Suspense fallback={<Loader />}>
            <ambientLight intensity={0.5} />
            <pointLight position={[5, 5, 5]} intensity={0.8} />
            <MetahumanScene isPlaying={isPlaying} animationData={animationData} audioBuffer={audioBuffer} />
            <Controls />
          </Suspense>
        </Canvas>
      </div>
    </>
  );
}