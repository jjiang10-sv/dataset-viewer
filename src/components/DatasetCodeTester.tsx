import React, { useState } from 'react';

interface DatasetCodeTesterProps {
  onNavigate?: (code: string) => void;
}

const DatasetCodeTester: React.FC<DatasetCodeTesterProps> = ({ onNavigate }) => {
  const [customCode, setCustomCode] = useState<string>('');

  // Sample dataset codes for testing
  const sampleCodes = [
    { code: 'DATASET001', name: 'Sales Data Q1 2024' },
    { code: 'USER_DATA_2024', name: 'User Analytics 2024' },
    { code: 'SURVEY_RESULTS', name: 'Customer Survey Results' },
    { code: 'PRODUCT_CATALOG', name: 'Product Catalog Data' },
    { code: 'FINANCIAL_REPORT', name: 'Financial Report Q4' }
  ];

  const navigateToDataset = (code: string) => {
    if (onNavigate) {
      onNavigate(code);
    } else {
      // Default navigation using URL query parameters
      const url = new URL(window.location.href);
      url.searchParams.set('code', code);
      window.location.href = url.toString();
    }
  };

  const handleCustomCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customCode.trim()) {
      navigateToDataset(customCode.trim());
    }
  };

  const getCurrentCode = (): string => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromQuery = urlParams.get('code');
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const codeFromHash = hashParams.get('code');
    const pathSegments = window.location.pathname.split('/');
    const codeFromPath = pathSegments[pathSegments.length - 1];
    
    return codeFromQuery || codeFromHash || 
      (codeFromPath !== 'dataset-viewer' && codeFromPath !== '' ? codeFromPath : '1234567890');
  };

  const currentCode = getCurrentCode();

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '25px',
      borderRadius: '12px',
      marginBottom: '20px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '20px' }}>
        🧪 Dataset Code Tester
      </h3>
      
      <div style={{ marginBottom: '20px' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '14px', opacity: 0.9 }}>
          <strong>Current Dataset Code:</strong> <code style={{ 
            background: 'rgba(255,255,255,0.2)', 
            padding: '4px 8px', 
            borderRadius: '4px',
            fontSize: '13px'
          }}>{currentCode}</code>
        </p>
        <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
          Change the code to load different datasets
        </p>
      </div>

      {/* Predefined Dataset Codes */}
      <div style={{ marginBottom: '25px' }}>
        <h4 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>
          📋 Sample Datasets
        </h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '10px' 
        }}>
          {sampleCodes.map((item) => (
            <button
              key={item.code}
              onClick={() => navigateToDataset(item.code)}
              style={{
                background: currentCode === item.code ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                color: 'white',
                border: currentCode === item.code ? '2px solid rgba(255,255,255,0.6)' : '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                padding: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '12px',
                textAlign: 'left' as const
              }}
              onMouseEnter={(e) => {
                if (currentCode !== item.code) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentCode !== item.code) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {item.code}
              </div>
              <div style={{ opacity: 0.8 }}>
                {item.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Code Input */}
      <div>
        <h4 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>
          ✏️ Custom Dataset Code
        </h4>
        <form onSubmit={handleCustomCodeSubmit} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={customCode}
            onChange={(e) => setCustomCode(e.target.value)}
            placeholder="Enter your dataset code..."
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: '14px'
            }}
          />
          <button
            type="submit"
            disabled={!customCode.trim()}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              background: customCode.trim() ? '#28a745' : 'rgba(255,255,255,0.2)',
              color: 'white',
              fontSize: '14px',
              cursor: customCode.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease'
            }}
          >
            Load
          </button>
        </form>
        <p style={{ margin: '10px 0 0 0', fontSize: '11px', opacity: 0.7 }}>
          💡 Tip: You can also manually edit the URL: <code>?code=YOUR_CODE</code>
        </p>
      </div>

      {/* URL Examples */}
      <details style={{ marginTop: '20px' }}>
        <summary style={{ 
          cursor: 'pointer', 
          fontSize: '14px', 
          marginBottom: '10px',
          opacity: 0.9
        }}>
          📖 URL Format Examples
        </summary>
        <div style={{ 
          background: 'rgba(0,0,0,0.2)', 
          padding: '15px', 
          borderRadius: '6px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <strong>Query Parameter:</strong><br />
            <code>{window.location.origin}{window.location.pathname}?code=YOUR_CODE</code>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <strong>Hash Parameter:</strong><br />
            <code>{window.location.origin}{window.location.pathname}#code=YOUR_CODE</code>
          </div>
          <div>
            <strong>Path Parameter:</strong><br />
            <code>{window.location.origin}/dataset-viewer/YOUR_CODE</code>
          </div>
        </div>
      </details>
    </div>
  );
};

export default DatasetCodeTester; 