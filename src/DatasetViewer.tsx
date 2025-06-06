import React, { useState, useEffect, useMemo, useRef } from 'react';
import './DatasetViewer.css';
import { DatasetRow, RowRating } from './types';
import { getCodeFromUrl, getRowId } from './utils/urlHelpers';
import { useDatasetApi } from './hooks/useDatasetApi';
import ErrorDisplay from './components/ErrorDisplay';
import PaginationControls from './components/PaginationControls';
import DatasetTable from './components/DatasetTable';
import OverallComment from './components/OverallComment';

const DatasetViewer: React.FC = () => {
  const { dataset, loading, error, saving, loadDataset, saveDataset, resetDataset, apiConfig } = useDatasetApi();
  const [columns, setColumns] = useState<string[]>([]);
  const [rowRatings, setRowRatings] = useState<Map<string | number, RowRating>>(new Map());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [overallComment, setOverallComment] = useState<string>('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Track if initialization has happened
  const initializationRef = useRef<boolean>(false);
  const currentCodeRef = useRef<string>('');

  // Memoize pagination calculations
  const paginationData = useMemo(() => {
    const totalItems = dataset.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPageData = dataset.slice(startIndex, endIndex);
    
    return { totalItems, totalPages, startIndex, endIndex, currentPageData };
  }, [dataset, currentPage, itemsPerPage]);

  // Single useEffect for initialization
  useEffect(() => {
    const currentCode = getCodeFromUrl();
    
    // Check if we need to reload due to code change
    if (currentCodeRef.current && currentCodeRef.current !== currentCode) {
      console.log('Dataset code changed, resetting...');
      resetDataset();
      initializationRef.current = false;
    }
    
    currentCodeRef.current = currentCode;

    // Prevent duplicate initialization
    if (initializationRef.current) {
      console.log('Already initialized, skipping...');
      return;
    }

    initializationRef.current = true;

    const initializeDataset = async () => {
      try {
        console.log('Initializing dataset...');
        const result = await loadDataset();
        
        if (result.dataset.length > 0) {
          // Set up columns
          const allColumns = Object.keys(result.dataset[0]);
          const idColumn = allColumns.find(col => col.toLowerCase() === 'id') || allColumns[0];
          const otherColumns = allColumns.filter(col => 
            col !== idColumn && 
            col.toLowerCase() !== 'rating' && 
            col.toLowerCase() !== 'comment'
          );
          setColumns([idColumn, ...otherColumns]);

          // Pre-populate rowRatings with existing ratings and comments
          const existingRatings = new Map<string | number, RowRating>();
          result.dataset.forEach((row, index) => {
            const safeRowId = getRowId(row, index, idColumn);
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

        // Set the overall comment from the loaded data
        if (result.overallComment) {
          setOverallComment(result.overallComment);
        }
      } catch (err) {
        console.error('Initialization failed:', err);
        initializationRef.current = false; // Allow retry
      }
    };

    initializeDataset();
  }, []); // Empty dependency array - only run once on mount

  // Separate effect for URL changes
  useEffect(() => {
    const handlePopState = () => {
      console.log('URL changed, reloading...');
      setRowRatings(new Map());
      setHasUnsavedChanges(false);
      setCurrentPage(1);
      setOverallComment('');
      initializationRef.current = false; // Allow re-initialization
      window.location.reload();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleRetry = () => {
    initializationRef.current = false; // Reset initialization flag
    window.location.reload();
  };

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

  const handleOverallCommentChange = (comment: string): void => {
    setOverallComment(comment);
    setHasUnsavedChanges(true);
  };

  const handleSaveAll = async (): Promise<void> => {
    if (rowRatings.size === 0 && overallComment.trim() === '') {
      alert('No ratings, comments, or overall comment to save.');
      return;
    }

    try {
      const updatedDataset = dataset.map((row, index) => {
        const safeRowId = getRowId(row, index, columns[0]);
        const ratingData = rowRatings.get(safeRowId);
        
        if (ratingData && (ratingData.rating > 0 || ratingData.comment.trim() !== '')) {
          return { ...row, rating: ratingData.rating, comment: ratingData.comment };
        }
        return row;
      });

      await saveDataset(updatedDataset, overallComment);
      setHasUnsavedChanges(false);
      alert('All ratings, comments, and overall comment saved successfully!');
    } catch (error) {
      alert(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
    document.querySelector('.table-container')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage: number): void => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  if (loading) {
    return <div className="loading">Loading dataset...</div>;
  }

  if (error) {
    return (
      <ErrorDisplay 
        error={error} 
        onRetry={handleRetry} 
        apiConfig={apiConfig()} 
      />
    );
  }

  return (
    <div className="dataset-viewer">
      <h1>📊 Public Dataset</h1>
      
      {/* Display current dataset code */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6', 
        borderRadius: '4px', 
        padding: '10px', 
        marginBottom: '20px',
        fontSize: '14px'
      }}>
        <strong>Dataset Code:</strong> <code>{getCodeFromUrl()}</code>
        {process.env.NODE_ENV === 'development' && (
          <div style={{ marginTop: '5px', fontSize: '12px', color: '#6c757d' }}>
            Debug: {dataset.length} rows loaded, {rowRatings.size} ratings stored, overall comment: {overallComment.length} chars
          </div>
        )}
      </div>

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
        <PaginationControls
          currentPage={currentPage}
          totalPages={paginationData.totalPages}
          totalItems={paginationData.totalItems}
          itemsPerPage={itemsPerPage}
          startIndex={paginationData.startIndex}
          endIndex={paginationData.endIndex}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}

      {/* Dataset Table */}
      <DatasetTable
        data={paginationData.currentPageData}
        columns={columns}
        rowRatings={rowRatings}
        onRatingChange={handleRatingChange}
        onCommentChange={handleCommentChange}
        saving={saving}
        startIndex={paginationData.startIndex}
      />

      {/* Pagination Controls - Bottom */}
      {dataset.length > 0 && paginationData.totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={paginationData.totalPages}
          totalItems={paginationData.totalItems}
          itemsPerPage={itemsPerPage}
          startIndex={paginationData.startIndex}
          endIndex={paginationData.endIndex}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          showItemsPerPageSelector={false}
        />
      )}

      {/* Overall Comment Section */}
      <OverallComment
        comment={overallComment}
        onCommentChange={handleOverallCommentChange}
        disabled={saving}
      />

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
    </div>
  );
};

export default DatasetViewer; 