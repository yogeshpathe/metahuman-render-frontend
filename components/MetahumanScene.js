import React from 'react';
import { useEnvironment } from './hooks/useEnvironment';
import MetahumanModel from './MetahumanModel'; // Import the new model component

// Default model URL, can be overridden by props if needed in the future
const DEFAULT_MODEL_URL = '/output/human_charactor_with_animation.glb';

function MetahumanScene({ 
  isPlaying, 
  animationData, 
  audioBuffer, 
  emotions, 
  setIsPlaying,
  modelUrl = DEFAULT_MODEL_URL // Allow model URL to be passed as a prop
}) {
  // Load HDR environment using the custom hook. This will apply to the whole scene.
  useEnvironment();

  // All other logic related to model loading, animation, audio, blinking, saccades
  // is now encapsulated within MetahumanModel.
  
  // The MetahumanModel component itself will handle its positioning and rotation if needed,
  // or we can wrap it here if the scene requires a specific layout.
  // For now, assuming MetahumanModel handles its own transform or uses a default.
  // The original group positioning: position={[0, -1.4, 0]} rotation={[0, 0, 0]}

  return (
    <group position={[0, -1.4, 0]} rotation={[0, 0, 0]}>
      <MetahumanModel
        modelUrl={modelUrl}
        isPlaying={isPlaying}
        animationData={animationData}
        audioBuffer={audioBuffer}
        emotions={emotions}
        setIsPlaying={setIsPlaying}
      />
    </group>
  );
}

export default MetahumanScene;
