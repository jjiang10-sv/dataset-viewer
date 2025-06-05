import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface DatasetRow {
  id: string | number;
  [key: string]: string | number | boolean;
}

interface PaginatedResponse {
  data: DatasetRow[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

interface VirtualizedDatasetViewerProps {
  baseUrl?: string;
}

const VirtualizedDatasetViewer: React.FC<VirtualizedDatasetViewerProps> = ({ 
  baseUrl = 'http://localhost:8001' 
}) => {
  const [dataset, setDataset] = useState<DatasetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 100,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false
  });
  
  // Search and sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Chunking state for large operations
  const [streamingProgress, setStreamingProgress] = useState<{
    isStreaming: boolean;
    progress: number;
    totalChunks: number;
    currentChunk: number;
  }>({
    isStreaming: false,
    progress: 0,
    totalChunks: 0,
    currentChunk: 0
  });

  // Debounced search
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch paginated data
  const fetchPaginatedData = useCallback(async (
    page: number = 1,
    pageSize: number = 100,
    search?: string,
    sortField?: string,
    sortDirection?: 'asc' | 'desc'
  ) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        ...(search && { search }),
        ...(sortField && { sort_by: sortField }),
        ...(sortDirection && { sort_order: sortDirection })
      });

      const response = await fetch(`${baseUrl}/v1/dataset/paginated?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: PaginatedResponse = await response.json();
      
      setDataset(result.data);
      setPagination({
        currentPage: result.page,
        pageSize: result.page_size,
        total: result.total,
        totalPages: result.total_pages,
        hasNext: result.has_next,
        hasPrevious: result.has_previous
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Error fetching paginated data:', err);
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  // Stream large dataset
  const streamDataset = useCallback(async (chunkSize: number = 1000) => {
    setStreamingProgress({
      isStreaming: true,
      progress: 0,
      totalChunks: 0,
      currentChunk: 0
    });

    try {
      const response = await fetch(`${baseUrl}/v1/dataset/stream?chunk_size=${chunkSize}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Stream not supported');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      const streamedData: DatasetRow[] = [];

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'metadata':
                  setStreamingProgress(prev => ({
                    ...prev,
                    totalChunks: data.total_chunks
                  }));
                  break;
                  
                case 'chunk':
                  streamedData.push(...data.data);
                  const progress = ((data.chunk_index + 1) / (streamingProgress.totalChunks || 1)) * 100;
                  setStreamingProgress(prev => ({
                    ...prev,
                    progress,
                    currentChunk: data.chunk_index + 1
                  }));
                  
                  // Update UI with streamed data
                  setDataset([...streamedData]);
                  break;
                  
                case 'complete':
                  setStreamingProgress(prev => ({
                    ...prev,
                    isStreaming: false,
                    progress: 100
                  }));
                  break;
                  
                case 'error':
                  throw new Error(data.message);
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming data:', parseError);
            }
          }
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Streaming failed');
      setStreamingProgress(prev => ({ ...prev, isStreaming: false }));
    }
  }, [baseUrl, streamingProgress.totalChunks]);

  // Load specific chunk
  const loadChunk = useCallback(async (chunkIndex: number, chunkSize: number = 1000) => {
    setLoading(true);
    
    try {
      const response = await fetch(`${baseUrl}/v1/dataset/chunk/${chunkIndex}?chunk_size=${chunkSize}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setDataset(result.data);
      
      // Update pagination info based on chunk
      setPagination({
        currentPage: chunkIndex + 1,
        pageSize: chunkSize,
        total: result.total_records,
        totalPages: Math.ceil(result.total_records / chunkSize),
        hasNext: result.end_idx < result.total_records,
        hasPrevious: chunkIndex > 0
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chunk');
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  // Effect to fetch data when parameters change
  useEffect(() => {
    fetchPaginatedData(1, pagination.pageSize, debouncedSearchTerm, sortBy, sortOrder);
  }, [debouncedSearchTerm, sortBy, sortOrder, fetchPaginatedData]);

  // Handle pagination
  const handlePageChange = useCallback((newPage: number) => {
    fetchPaginatedData(newPage, pagination.pageSize, debouncedSearchTerm, sortBy, sortOrder);
  }, [fetchPaginatedData, pagination.pageSize, debouncedSearchTerm, sortBy, sortOrder]);

  // Handle page size change
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    fetchPaginatedData(1, newPageSize, debouncedSearchTerm, sortBy, sortOrder);
  }, [fetchPaginatedData, debouncedSearchTerm, sortBy, sortOrder]);

  // Handle sorting
  const handleSort = useCallback((field: string) => {
    const newSortOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(field);
    setSortOrder(newSortOrder);
  }, [sortBy, sortOrder]);

  // Get table columns
  const columns = useMemo(() => {
    if (dataset.length === 0) return [];
    return Object.keys(dataset[0]).filter(col => 
      col.toLowerCase() !== 'rating' && col.toLowerCase() !== 'comment'
    );
  }, [dataset]);

  return (
    <div style={{ padding: '20px', maxWidth: '100%' }}>
      <h1>📊 Large Dataset Viewer</h1>

      {/* Controls */}
      <div style={{ 
        display: 'flex', 
        gap: '15px', 
        marginBottom: '20px', 
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {/* Search */}
        <input
          type="text"
          placeholder="Search datasets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ 
            padding: '8px 12px', 
            borderRadius: '4px', 
            border: '1px solid #ddd',
            minWidth: '200px'
          }}
        />

        {/* Page Size Selector */}
        <select
          value={pagination.pageSize}
          onChange={(e) => handlePageSizeChange(Number(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
          <option value={500}>500 per page</option>
          <option value={1000}>1000 per page</option>
        </select>

        {/* Streaming Controls */}
        <button
          onClick={() => streamDataset(1000)}
          disabled={streamingProgress.isStreaming}
          style={{
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: streamingProgress.isStreaming ? 'not-allowed' : 'pointer'
          }}
        >
          {streamingProgress.isStreaming ? 'Streaming...' : 'Stream All Data'}
        </button>
      </div>

      {/* Streaming Progress */}
      {streamingProgress.isStreaming && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '10px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '4px' 
        }}>
          <div>Streaming Progress: {streamingProgress.progress.toFixed(1)}%</div>
          <div>Chunk {streamingProgress.currentChunk} of {streamingProgress.totalChunks}</div>
          <div style={{ 
            width: '100%', 
            height: '8px', 
            backgroundColor: '#e9ecef', 
            borderRadius: '4px',
            marginTop: '5px'
          }}>
            <div style={{
              width: `${streamingProgress.progress}%`,
              height: '100%',
              backgroundColor: '#28a745',
              borderRadius: '4px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        marginBottom: '15px',
        fontSize: '14px',
        color: '#666'
      }}>
        <span>Total Records: {pagination.total.toLocaleString()}</span>
        <span>
          Showing: {((pagination.currentPage - 1) * pagination.pageSize) + 1} - {' '}
          {Math.min(pagination.currentPage * pagination.pageSize, pagination.total)} of {pagination.total.toLocaleString()}
        </span>
        <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ 
          color: 'red', 
          backgroundColor: '#fee', 
          padding: '10px', 
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          Error: {error}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          Loading...
        </div>
      )}

      {/* Data Table */}
      {!loading && dataset.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '14px'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                {columns.map(column => (
                  <th 
                    key={column}
                    onClick={() => handleSort(column)}
                    style={{
                      padding: '12px 8px',
                      textAlign: 'left',
                      borderBottom: '2px solid #dee2e6',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    {column}
                    {sortBy === column && (
                      <span style={{ marginLeft: '5px' }}>
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataset.map((row, index) => (
                <tr 
                  key={row.id || index}
                  style={{ 
                    borderBottom: '1px solid #dee2e6',
                    backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa'
                  }}
                >
                  {columns.map(column => (
                    <td 
                      key={column}
                      style={{
                        padding: '8px',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={String(row[column])}
                    >
                      {String(row[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && pagination.totalPages > 1 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          gap: '10px',
          marginTop: '20px'
        }}>
          <button
            onClick={() => handlePageChange(1)}
            disabled={!pagination.hasPrevious}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: pagination.hasPrevious ? 'pointer' : 'not-allowed'
            }}
          >
            First
          </button>
          
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevious}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: pagination.hasPrevious ? 'pointer' : 'not-allowed'
            }}
          >
            Previous
          </button>

          <span style={{ margin: '0 15px' }}>
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>

          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNext}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: pagination.hasNext ? 'pointer' : 'not-allowed'
            }}
          >
            Next
          </button>

          <button
            onClick={() => handlePageChange(pagination.totalPages)}
            disabled={!pagination.hasNext}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: pagination.hasNext ? 'pointer' : 'not-allowed'
            }}
          >
            Last
          </button>
        </div>
      )}
    </div>
  );
};

export default VirtualizedDatasetViewer; 