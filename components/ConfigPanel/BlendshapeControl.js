import React from 'react';

const BlendshapeControl = ({ blendshapes, onBlendshapeChange }) => {
  return (
    <div className="p-4 border rounded-lg shadow-sm bg-gray-800 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 max-h-[80vh] overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4 text-gray-300 ">Blendshape Control</h3>
      <div className="space-y-4">
        {Object.entries(blendshapes).map(([key, value]) => (
          <div key={key} className="flex items-center">
            <label htmlFor={key} className="w-1/3 text-sm font-medium text-gray-300 capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}:
            </label>
            <input
              type="range"
              id={key}
              min="0"
              max="1"
              step="0.01"
              value={value}
              onChange={(e) => onBlendshapeChange(key, parseFloat(e.target.value))}
              className="w-2/3 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="ml-3 text-sm text-gray-300">{value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BlendshapeControl;
