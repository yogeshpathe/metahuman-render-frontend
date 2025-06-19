import React, { useState, useEffect } from 'react';
import EmotionControl from './EmotionControl';
import Audio2FaceTuning from './Audio2FaceTuning';
import BlendshapeControl from './BlendshapeControl';

const ConfigPanel = ({ emotions }) => { // Accept emotions as a prop
  const [config, setConfig] = useState({
    emotion: {
      happiness: 0.5,
      anger: 0.0,
      sadness: 0.0,
      surprise: 0.0,
      disgust: 0.0,
      fear: 0.0,
      neutral: 0.5,
    },
    audio2face: {
      jawOpen: 0.5,
      mouthShape: 0.5,
      lipSyncIntensity: 0.5,
    },
    blendshapes: {
      browInnerUp: 0.0,
      browDownLeft: 0.0,
      browDownRight: 0.0,
      browOuterUpLeft: 0.0,
      browOuterUpRight: 0.0,
      eyeLookUpLeft: 0.0,
      eyeLookUpRight: 0.0,
      eyeLookDownLeft: 0.0,
      eyeLookDownRight: 0.0,
      eyeLookInLeft: 0.0,
      eyeLookInRight: 0.0,
      eyeLookOutLeft: 0.0,
      eyeLookOutRight: 0.0,
      eyeBlinkLeft: 0.0,
      eyeBlinkRight: 0.0,
      eyeSquintLeft: 0.0,
      eyeSquintRight: 0.0,
      eyeWideLeft: 0.0,
      eyeWideRight: 0.0,
      cheekPuff: 0.0,
      cheekSquintLeft: 0.0,
      cheekSquintRight: 0.0,
      noseSneerLeft: 0.0,
      noseSneerRight: 0.0,
      mouthFunnel: 0.0,
      mouthPucker: 0.0,
      mouthLeft: 0.0,
      mouthRight: 0.0,
      mouthRollUpper: 0.0,
      mouthRollLower: 0.0,
      mouthShrugUpper: 0.0,
      mouthShrugLower: 0.0,
      mouthClose: 0.0,
      mouthSmileLeft: 0.0,
      mouthSmileRight: 0.0,
      mouthFrownLeft: 0.0,
      mouthFrownRight: 0.0,
      mouthDimpleLeft: 0.0,
      mouthDimpleRight: 0.0,
      mouthStretchLeft: 0.0,
      mouthStretchRight: 0.0,
      mouthPressLeft: 0.0,
      mouthPressRight: 0.0,
      mouthUpperUpLeft: 0.0,
      mouthUpperUpRight: 0.0,
      mouthLowerDownLeft: 0.0,
      mouthLowerDownRight: 0.0,
      mouthOpen: 0.0,
      mouthTongueOut: 0.0,
      jawForward: 0.0,
      jawLeft: 0.0,
      jawRight: 0.0,
    },
  });

  const handleEmotionChange = (key, value) => {
    setConfig((prevConfig) => ({
      ...prevConfig,
      emotion: {
        ...prevConfig.emotion,
        [key]: value,
      },
    }));
  };

  const handleAudio2FaceParamChange = (key, value) => {
    setConfig((prevConfig) => ({
      ...prevConfig,
      audio2face: {
        ...prevConfig.audio2face,
        [key]: value,
      },
    }));
  };

  const handleBlendshapeChange = (key, value) => {
    setConfig((prevConfig) => ({
      ...prevConfig,
      blendshapes: {
        ...prevConfig.blendshapes,
        [key]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    console.log('Submitting config:', config);
    try {
      const response = await fetch('/api/update-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        console.log('Config updated successfully!');
        alert('Configuration updated successfully!');
      } else {
        console.error('Failed to update config:', response.statusText);
        alert('Failed to update configuration.');
      }
    } catch (error) {
      console.error('Error submitting config:', error);
      alert('Error submitting configuration.');
    }
  };

  // Effect to update emotion controls when new emotions data is received
  useEffect(() => {
    if (emotions && emotions.length > 0) {
      // Assuming the last frame of emotions is representative or you want to display live updates
      // For simplicity, let's take the first frame's emotion values if available,
      // or you might want to average them or display them dynamically.
      const currentEmotions = emotions[0]?.emotion_values || {};
      setConfig(prevConfig => ({
        ...prevConfig,
        emotion: {
          ...prevConfig.emotion, // Keep existing manual settings
          ...currentEmotions // Override/update with API data
        }
      }));
    }
  }, [emotions]);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">3D Model Configuration</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Pass the API-driven emotion data to EmotionControl */}
        <EmotionControl emotion={config.emotion} onEmotionChange={handleEmotionChange} isApiDriven={!!emotions} />
        <Audio2FaceTuning
          audio2faceParams={config.audio2face}
          onAudio2FaceParamChange={handleAudio2FaceParamChange}
        />
        <BlendshapeControl
          blendshapes={config.blendshapes}
          onBlendshapeChange={handleBlendshapeChange}
        />
      </div>
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSubmit}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Update Model
        </button>
      </div>
    </div>
  );
};

export default ConfigPanel;
