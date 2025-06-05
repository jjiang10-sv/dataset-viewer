import React, { useState } from 'react';
import DatasetViewer from './DatasetViewer';
import VirtualizedDatasetViewer from './components/VirtualizedDatasetViewer';
import './App.css';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'standard' | 'virtualized'>('standard');

  return (
    <div className="App">
      {/* View Mode Selector */}
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderBottom: '1px solid #dee2e6',
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
      }}>
        <span style={{ fontWeight: 'bold' }}>View Mode:</span>
        <button
          onClick={() => setViewMode('standard')}
          style={{
            padding: '8px 16px',
            backgroundColor: viewMode === 'standard' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Standard Viewer
        </button>
        <button
          onClick={() => setViewMode('virtualized')}
          style={{
            padding: '8px 16px',
            backgroundColor: viewMode === 'virtualized' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Large Dataset Viewer
        </button>
        <span style={{ fontSize: '14px', color: '#666', marginLeft: '10px' }}>
          {viewMode === 'virtualized' 
            ? 'Optimized for millions of records with pagination, streaming & chunking'
            : 'Basic viewer for smaller datasets'
          }
        </span>
      </div>

      {/* Render selected viewer */}
      {viewMode === 'standard' ? (
        <DatasetViewer />
      ) : (
        <VirtualizedDatasetViewer />
      )}
    </div>
  );
}

export default App; 