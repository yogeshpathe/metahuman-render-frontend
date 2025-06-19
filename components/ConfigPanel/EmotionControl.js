import React from 'react';

const EmotionControl = ({ emotion, onEmotionChange, isApiDriven }) => {
  // Filter out emotions that are not present in the initial config or have zero value from API
  // This helps in not showing sliders for every possible emotion if not relevant
  const relevantEmotions = Object.entries(emotion).filter(([key, value]) => {
    // Standard emotions expected to be in the initial config or always show if API driven
    const standardEmotions = ['happiness', 'anger', 'sadness', 'surprise', 'disgust', 'fear', 'neutral'];
    if (standardEmotions.includes(key)) return true;
    // For other emotions (dynamically added from API), only show if their value is > 0
    return isApiDriven && typeof value === 'number' && value > 0;
  });


  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white">
      <h3 className="text-lg font-semibold mb-4">Emotion Control</h3>
      <div className="space-y-4">
        {relevantEmotions.map(([key, value]) => (
          <div key={key} className="flex items-center">
            <label htmlFor={key} className="w-1/3 text-sm font-medium text-gray-700 capitalize">
              {key.replace(/([A-Z]|_)/g, (match) => match === '_' ? ' ' : ` ${match}`).trim()}:
            </label>
            <input
              type="range"
              id={key}
              min="0"
              max="1"
              step="0.01"
              value={typeof value === 'number' ? value : 0} // Ensure value is a number
              onChange={(e) => onEmotionChange(key, parseFloat(e.target.value))}
              className="w-2/3 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              disabled={isApiDriven && !['happiness', 'anger', 'sadness', 'surprise', 'disgust', 'fear', 'neutral'].includes(key)} // Disable if API driven and not a standard manually adjustable one
            />
            <span className="ml-3 text-sm text-gray-600">{(typeof value === 'number' ? value : 0).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmotionControl;
