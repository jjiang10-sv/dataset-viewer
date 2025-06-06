import React from 'react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  showItemsPerPageSelector?: boolean;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  startIndex,
  endIndex,
  onPageChange,
  onItemsPerPageChange,
  showItemsPerPageSelector = true
}) => {
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

  return (
    <div className="pagination-controls">
      {showItemsPerPageSelector && (
        <div className="pagination-info">
          <span>
            Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} items
          </span>
          <select 
            value={itemsPerPage} 
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="items-per-page-select"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      )}
      
      <div className="pagination-buttons">
        <button 
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="pagination-btn"
        >
          First
        </button>
        <button 
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="pagination-btn"
        >
          Previous
        </button>
        
        {getPaginationRange().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
          >
            {page}
          </button>
        ))}
        
        <button 
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="pagination-btn"
        >
          Next
        </button>
        <button 
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="pagination-btn"
        >
          Last
        </button>
      </div>
    </div>
  );
};

export default PaginationControls; 