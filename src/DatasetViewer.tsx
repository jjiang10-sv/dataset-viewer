import React, { useState, useEffect, useCallback } from 'react';
import './DatasetViewer.css';
//import DatasetCodeTester from './components/DatasetCodeTester';

interface DatasetRow {
  id: string | number;
  [key: string]: string | number | boolean;
}

interface RowRating {
  rowId: string | number;
  rating: number;
  comment: string;
}

interface GiscusConfig {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: string;
  term?: string;
  reactionsEnabled: string;
  emitMetadata: string;
  inputPosition: string;
  theme: string;
  lang: string;
  loading?: string;
}

// API Configuration
interface ApiConfig {
  baseUrl: string;
  endpoint: string;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST';
  body?: any;
}

declare global {
  interface Window {
    giscus?: {
      setConfig: (config: Partial<GiscusConfig>) => void;
    };
  }
}

const DatasetViewer: React.FC = () => {
  const [dataset, setDataset] = useState<DatasetRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [rowRatings, setRowRatings] = useState<Map<string | number, RowRating>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);
  const apiBaseUrl = 'https://e7zf4xjf2k.execute-api.us-east-1.amazonaws.com/prod';

  // Extract code from URL parameters
  const getCodeFromUrl = (): string => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromQuery = urlParams.get('code');
    
    // Also check hash parameters (for URLs like example.com#code=123)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const codeFromHash = hashParams.get('code');
    
    // Also check path parameters (for URLs like example.com/dataset/123)
    const pathSegments = window.location.pathname.split('/');
    const codeFromPath = pathSegments[pathSegments.length - 1];
    
    // Priority: query param > hash param > path param > default
    return codeFromQuery || codeFromHash || (codeFromPath !== 'dataset-viewer' && codeFromPath !== '' ? codeFromPath : '1234567890');
  };

  // API Configuration - you can customize these values
  const apiConfig = (): ApiConfig => {
    // Priority: Environment variables > URL parameter > Default fallback
    const codeFromUrl = getCodeFromUrl();
    
    const apiEndpoint = '/v1/getDataset';
    const apiKey = process.env.REACT_APP_API_KEY;
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    // Add API key if provided
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
      // Or use: headers['X-API-Key'] = apiKey; depending on the API
    }

    return {
      baseUrl: apiBaseUrl,
      endpoint: apiEndpoint,
      headers,
      method: 'POST',
      body: {
        // Use code from URL, fallback to default if not provided
        fileCode: codeFromUrl
      }
    };
  };

  // Transform API response to match our DatasetRow format
  const transformApiResponse = (data: any[]): DatasetRow[] => {
    if (!Array.isArray(data)) {
      throw new Error('API response is not an array');
    }

    return data.map((item, index) => {
      // Ensure each row has an id field
      if (!item.id) {
        item.id = index + 1;
      }
      
      // Convert all values to appropriate types
      const transformedItem: DatasetRow = { id: item.id };
      
      Object.keys(item).forEach(key => {
        if (key !== 'id') {
          const value = item[key];
          // Keep original type but ensure it's serializable
          if (typeof value === 'object' && value !== null) {
            transformedItem[key] = JSON.stringify(value);
          } else {
            transformedItem[key] = value;
          }
        }
      });

      return transformedItem;
    });
  };

  const fetchDataWithRetry = useCallback(async (maxRetries: number = 3): Promise<DatasetRow[]> => {
    const config = apiConfig();
    const url = `${config.baseUrl}${config.endpoint}`;
    const codeFromUrl = getCodeFromUrl();
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Fetching data from: ${url} with code: ${codeFromUrl} (Attempt ${attempt}/${maxRetries})`);
        
        const requestOptions: RequestInit = {
          method: config.method || 'GET',
          headers: config.headers,
          // Add CORS mode
          mode: 'cors',
          // Add credentials if needed for authentication
          credentials: 'omit',
        };

        if (config.body && config.method === 'POST') {
          requestOptions.body = JSON.stringify(config.body);
        }

        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return transformApiResponse(data.data);
        
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          // If it's a CORS error, provide helpful guidance
          if (error instanceof TypeError && error.message.includes('CORS')) {
            throw new Error(`CORS Error: Unable to fetch from ${url}. This may be due to CORS restrictions. Consider using a proxy server or enabling CORS on the API.`);
          }
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    throw new Error('Max retries exceeded');
  }, []); // Dependencies for when to re-create this function

  useEffect(() => {
    const loadDataset = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await fetchDataWithRetry(3);
        setDataset(data);
        
        if (data.length > 0) {
          // Ensure 'id' is the first column, exclude 'rating' and 'comment' from display columns
          const allColumns = Object.keys(data[0]);
          const idColumn = allColumns.find(col => col.toLowerCase() === 'id') || allColumns[0];
          const otherColumns = allColumns.filter(col => 
            col !== idColumn && 
            col.toLowerCase() !== 'rating' && 
            col.toLowerCase() !== 'comment'
          );
          setColumns([idColumn, ...otherColumns]);

          // Pre-populate rowRatings with existing ratings and comments from dataset
          const existingRatings = new Map<string | number, RowRating>();
          data.forEach((row, index) => {
            const rowId = row.id || row[idColumn] || index;
            const safeRowId = typeof rowId === 'boolean' ? index : rowId;
            
            // Check if row has rating or comment data
            const rating = typeof row.rating === 'number' ? row.rating : 0;
            const comment = typeof row.comment === 'string' ? row.comment : '';
            
            if (rating > 0 || comment.trim() !== '') {
              existingRatings.set(safeRowId, {
                rowId: safeRowId,
                rating,
                comment
              });
            }
          });
          
          setRowRatings(existingRatings);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Failed to load dataset:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDataset();
  }, [fetchDataWithRetry]); // Now fetchDataWithRetry is properly memoized

  // Listen for URL changes to reload data when code changes
  useEffect(() => {
    const handlePopState = () => {
      // Clear previous state and reload data
      setRowRatings(new Map());
      setHasUnsavedChanges(false);
      setCurrentPage(1);
      
      // Force component to re-fetch data with new URL
      window.location.reload();
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Retry function for manual retry
  const handleRetry = () => {
    setError(null);
    setLoading(true);
    
    // Trigger re-fetch by reloading the page or re-running the effect
    window.location.reload();
  };

  useEffect(() => {
    // Initialize Giscus
    const script = document.createElement('script');

    // <script src="https://giscus.app/client.js"
    //     data-repo="jjiang10-sv/dataset-viewer"
    //     data-repo-id="R_kgDOO07JRQ"
    //     data-category="[ENTER CATEGORY NAME HERE]"
    //     data-category-id="[ENTER CATEGORY ID HERE]"
    //     data-mapping="url"
    //     data-strict="0"
    //     data-reactions-enabled="1"
    //     data-emit-metadata="0"
    //     data-input-position="bottom"
    //     data-theme="preferred_color_scheme"
    //     data-lang="en"
    //     crossorigin="anonymous"
    // </script>
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'jjiang10-sv/dataset-viewer'); // Replace with your repo
    script.setAttribute('data-repo-id', 'R_kgDOO07JRQ'); // Replace with your repo ID
    script.setAttribute('data-category', 'General'); // Replace with your category
    script.setAttribute('data-category-id', 'DIC_kwDOO07JRc4Cq9I7'); // Replace with your category ID
    script.setAttribute('data-mapping', 'url');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', 'preferred_color_scheme');
    script.setAttribute('data-lang', 'en');
    script.setAttribute('data-loading', 'lazy');
    script.crossOrigin = 'anonymous';
    script.async = true;

    const giscusContainer = document.getElementById('giscus-container');
    if (giscusContainer) {
      // Clear any existing giscus content
      giscusContainer.innerHTML = '';
      giscusContainer.appendChild(script);
    }

    return () => {
      // Cleanup on unmount
      if (giscusContainer) {
        giscusContainer.innerHTML = '';
      }
    };
  }, []);

  const handleRatingChange = (rowId: string | number, rating: number): void => {
    setRowRatings(prev => {
      const newRatings = new Map(prev);
      const existing = newRatings.get(rowId) || { rowId, rating: 0, comment: '' };
      newRatings.set(rowId, { ...existing, rating });
      return newRatings;
    });
    setHasUnsavedChanges(true);
  };

  const handleCommentChange = (rowId: string | number, comment: string): void => {
    setRowRatings(prev => {
      const newRatings = new Map(prev);
      const existing = newRatings.get(rowId) || { rowId, rating: 0, comment: '' };
      newRatings.set(rowId, { ...existing, comment });
      return newRatings;
    });
    setHasUnsavedChanges(true);
  };

  const handleSaveAll = async (): Promise<void> => {
    if (rowRatings.size === 0) {
      alert('No ratings or comments to save.');
      return;
    }

    setSaving(true);

    try {
      // Update the dataset with all ratings and comments
      const updatedDataset = dataset.map(row => {
        const currentRowId = row.id || row[columns[0]];
        const ratingData = rowRatings.get(currentRowId as string | number);
        
        if (ratingData && (ratingData.rating > 0 || ratingData.comment.trim() !== '')) {
          return {
            ...row,
            rating: ratingData.rating,
            comment: ratingData.comment
          };
        }
        return row;
      });

      const codeFromUrl = getCodeFromUrl();
      
      const response = await fetch(`${apiBaseUrl}/v1/saveDataset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          dataset: updatedDataset,
          fileCode: codeFromUrl,
          // Optional: keep clientId for backward compatibility
          clientId: 'test'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save ratings');
      }

      const result = await response.json();
      
      // Update local state
      setDataset(updatedDataset);
      setHasUnsavedChanges(false);
      
      console.log('All ratings saved successfully:', result);
      alert('All ratings and comments saved successfully!');
    } catch (error) {
      console.error('Error saving ratings:', error);
      alert(`Failed to save ratings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const getRatingTitle = (star: number): string => {
    const titles = ['', 'Terrible', 'Not good', 'Average', 'Very good', 'Amazing'];
    return titles[star] || '';
  };

  // Pagination calculations
  const totalItems = dataset.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageData = dataset.slice(startIndex, endIndex);

  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
    // Scroll to top of table when page changes
    document.querySelector('.table-container')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage: number): void => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const getPaginationRange = (): number[] => {
    const range: number[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        range.push(i);
      }
    } else {
      const halfRange = Math.floor(maxVisiblePages / 2);
      let start = Math.max(1, currentPage - halfRange);
      let end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      if (end - start < maxVisiblePages - 1) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }
      
      for (let i = start; i <= end; i++) {
        range.push(i);
      }
    }
    
    return range;
  };

  if (loading) {
    return <div className="loading">Loading dataset...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-header">
          <h2>⚠️ Failed to Load Dataset</h2>
        </div>
        <div className="error-message">
          <p><strong>Error:</strong> {error}</p>
        </div>
        <div className="error-actions">
          <button className="retry-btn" onClick={handleRetry}>
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
          <pre>{JSON.stringify(apiConfig(), null, 2)}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="dataset-viewer">
      <h1>📊 Public Dataset</h1>
      
      {/* Dataset Code Tester Component */}
      {/* <DatasetCodeTester /> */}

      {/* Save Button */}
      {hasUnsavedChanges && (
        <div className="save-section">
          <button
            className="save-all-btn"
            onClick={handleSaveAll}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
          <span className="unsaved-indicator">You have unsaved changes</span>
        </div>
      )}

      {/* Pagination Controls - Top */}
      {dataset.length > 0 && (
        <div className="pagination-controls top">
          <div className="pagination-info">
            <span>
              Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} items
            </span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="items-per-page-select"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
          
          <div className="pagination-buttons">
            <button 
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              First
            </button>
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              Previous
            </button>
            
            {getPaginationRange().map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
              >
                {page}
              </button>
            ))}
            
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Next
            </button>
            <button 
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Dataset Table */}
      <div className="table-container">
        {dataset.length > 0 ? (
          <table className="dataset-table">
            <thead>
              <tr>
                {columns.map((column: string) => (
                  <th key={column}>{column}</th>
                ))}
                <th>Rating & Comments</th>
              </tr>
            </thead>
            <tbody>
              {currentPageData.map((row: DatasetRow, index: number) => {
                const actualIndex = startIndex + index; // Get the actual index in the full dataset
                const rowId = row.id || row[columns[0]] || actualIndex;
                // Ensure rowId is string or number, not boolean
                const safeRowId = typeof rowId === 'boolean' ? actualIndex : rowId;
                const currentRating = rowRatings.get(safeRowId);
                
                return (
                  <tr key={safeRowId}>
                    {columns.map((column: string) => (
                      <td key={column}>{String(row[column])}</td>
                    ))}
                    <td className="rating-cell">
                      <div className="row-rating">
                        {/* Star Rating */}
                        <div className="star-rating-inline">
                          {[1, 2, 3, 4, 5].map((star: number) => (
                            <label key={star} className="star-label-inline">
                              <input
                                type="radio"
                                name={`rating-${safeRowId}`}
                                value={star}
                                checked={currentRating?.rating === star}
                                onChange={() => handleRatingChange(safeRowId, star)}
                                disabled={saving}
                              />
                              <span 
                                className={`star-icon ${currentRating?.rating && currentRating.rating >= star ? 'filled' : 'empty'}`} 
                                title={getRatingTitle(star)}
                              >
                                ★
                              </span>
                            </label>
                          ))}
                        </div>
                        
                        {/* Comment Input */}
                        <textarea
                          className="comment-input"
                          placeholder="Add a comment..."
                          value={currentRating?.comment || ''}
                          onChange={(e) => handleCommentChange(safeRowId, e.target.value)}
                          disabled={saving}
                          rows={2}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>No data available</p>
        )}
      </div>

      {/* Pagination Controls - Bottom */}
      {dataset.length > 0 && totalPages > 1 && (
        <div className="pagination-controls bottom">
          <div className="pagination-buttons">
            <button 
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              First
            </button>
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              Previous
            </button>
            
            {getPaginationRange().map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
              >
                {page}
              </button>
            ))}
            
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Next
            </button>
            <button 
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Save Button at Bottom */}
      {hasUnsavedChanges && (
        <div className="save-section bottom-save">
          <button
            className="save-all-btn"
            onClick={handleSaveAll}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      )}

      {/* Overall Comments with Giscus */}
      <h2>💬 Overall Comments</h2>
      <div id="giscus-container"></div>
    </div>
  );
};

export default DatasetViewer; 