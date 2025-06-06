import React from 'react';

interface LoadingProgressProps {
  progress: number;
  message?: string;
}

const LoadingProgress: React.FC<LoadingProgressProps> = ({ progress, message = 'Loading...' }) => {
  return (
    <div className="loading-container">
      <div className="loading-message">{message}</div>
      <div className="progress-bar-container">
        <div 
          className="progress-bar" 
          style={{ 
            width: `${progress}%`,
            height: '20px',
            backgroundColor: '#007bff',
            borderRadius: '10px',
            transition: 'width 0.3s ease'
          }}
        />
      </div>
      <div className="progress-text">{Math.round(progress)}%</div>
    </div>
  );
};

export default LoadingProgress; 