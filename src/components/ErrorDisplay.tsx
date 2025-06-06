import React from 'react';
import { ApiConfig } from '../types';

interface ErrorDisplayProps {
  error: string;
  onRetry: () => void;
  apiConfig: ApiConfig;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry, apiConfig }) => {
  return (
    <div className="error-container">
      <div className="error-header">
        <h2>⚠️ Failed to Load Dataset</h2>
      </div>
      <div className="error-message">
        <p><strong>Error:</strong> {error}</p>
      </div>
      <div className="error-actions">
        <button className="retry-btn" onClick={onRetry}>
          🔄 Retry
        </button>
        <details className="error-details">
          <summary>Troubleshooting Tips</summary>
          <ul>
            <li>Check your internet connection</li>
            <li>Verify the API endpoint is accessible</li>
            <li>For CORS errors, consider using a proxy or enabling CORS on the API</li>
            <li>Check if the API requires authentication</li>
            <li>Verify the API response format matches expected structure</li>
          </ul>
        </details>
      </div>
      <div className="api-info">
        <p><strong>API Configuration:</strong></p>
        <pre>{JSON.stringify(apiConfig, null, 2)}</pre>
      </div>
    </div>
  );
};

export default ErrorDisplay; 