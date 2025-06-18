import React from 'react';

const EmotionControl = ({ emotion, onEmotionChange }) => {
  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white">
      <h3 className="text-lg font-semibold mb-4">Emotion Control</h3>
      <div className="space-y-4">
        {Object.entries(emotion).map(([key, value]) => (
          <div key={key} className="flex items-center">
            <label htmlFor={key} className="w-1/3 text-sm font-medium text-gray-700 capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}:
            </label>
            <input
              type="range"
              id={key}
              min="0"
              max="1"
              step="0.01"
              value={value}
              onChange={(e) => onEmotionChange(key, parseFloat(e.target.value))}
              className="w-2/3 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="ml-3 text-sm text-gray-600">{value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmotionControl;
