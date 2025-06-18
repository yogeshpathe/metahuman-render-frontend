'use client';

import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';

import MetahumanScene from '../components/MetahumanScene';
import Loader from '../components/Loader';
import SceneControls from '../components/SceneControls';
import { generateAnimationFromPrompt } from '../utils/api';
import ConfigPanel from '../components/ConfigPanel/ConfigPanel';

export default function MetahumanPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [animationData, setAnimationData] = useState(null);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateAnimation = async () => {
    if (!prompt) return;

    const { animationData, audioBuffer } = await generateAnimationFromPrompt(prompt, setIsLoading);
    
    if (animationData && audioBuffer) {
      setAnimationData(animationData);
      setAudioBuffer(audioBuffer);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Existing UI for animation generation */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here"
          className="p-2 text-base w-[400px] rounded border border-gray-300"
          disabled={isLoading}
        />
        <button
          onClick={handleGenerateAnimation}
          disabled={isLoading || !prompt}
          className="p-2 text-base cursor-pointer bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Generating...' : 'Generate Animation'}
        </button>
      </div>

      {/* 3D Scene */}
      <div className="h-full w-1/2">
        <Canvas camera={{ position: [0, 0.2, 1.8], fov: 35 }}>
          <Suspense fallback={<Loader />}>
            <ambientLight intensity={0.5} />
            <pointLight position={[5, 5, 5]} intensity={0.8} />
            <MetahumanScene isPlaying={isPlaying} animationData={animationData} audioBuffer={audioBuffer} setIsPlaying={setIsPlaying} />
            <SceneControls />
          </Suspense>
        </Canvas>
      </div>

      {/* Config Panel */}
      <div className="h-full w-1/2 bg-white shadow-lg overflow-y-auto">
        <ConfigPanel />
      </div>
    </div>
  );
}
