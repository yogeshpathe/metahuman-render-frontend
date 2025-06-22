import { useEffect, useState } from 'react';

export function useAnimationData(animationData, emotions) {
  const [frames, setFrames] = useState([]);
  const [emotionFrames, setEmotionFrames] = useState([]);
  const [blendShapeNames, setBlendShapeNames] = useState([]);

  // Process animation data from API
  useEffect(() => {
    if (animationData && animationData.length > 0) {
      const apiBlendShapeNames = Object.keys(animationData[0].blendShapes);
      const frameData = animationData.map(frame =>
        apiBlendShapeNames.map(name => frame.blendShapes[name])
      );
      const normalizedNames = apiBlendShapeNames.map(name =>
        name.charAt(0).toLowerCase() + name.slice(1)
      );

      setBlendShapeNames(normalizedNames);
      setFrames(frameData);
      console.log('Loaded frames from API:', frameData.length, 'blend shapes:', normalizedNames.length);
    } else {
      setFrames([]);
      setBlendShapeNames([]);
    }
  }, [animationData]);

  // Process emotion data
  useEffect(() => {
    if (emotions && emotions.length > 0) {
      setEmotionFrames(emotions.map(frame => frame.emotion_values));
      console.log('Loaded emotion frames:', emotions.length);
    } else {
      setEmotionFrames([]);
    }
  }, [emotions]);

  return { frames, emotionFrames, blendShapeNames };
}
