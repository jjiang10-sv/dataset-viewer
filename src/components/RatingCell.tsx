import React from 'react';
import { RowRating } from '../types';

interface RatingCellProps {
  rowId: string | number;
  currentRating?: RowRating;
  onRatingChange: (rowId: string | number, rating: number) => void;
  onCommentChange: (rowId: string | number, comment: string) => void;
  disabled?: boolean;
}

const RatingCell: React.FC<RatingCellProps> = ({
  rowId,
  currentRating,
  onRatingChange,
  onCommentChange,
  disabled = false
}) => {
  const getRatingTitle = (star: number): string => {
    const titles = ['', 'Terrible', 'Not good', 'Average', 'Very good', 'Amazing'];
    return titles[star] || '';
  };

  return (
    <td className="rating-cell">
      <div className="row-rating">
        {/* Star Rating */}
        <div className="star-rating-inline">
          {[1, 2, 3, 4, 5].map((star: number) => (
            <label key={`rating-${rowId}-star-${star}`} className="star-label-inline">
              <input
                type="radio"
                name={`rating-${rowId}`}
                value={star}
                checked={currentRating?.rating === star}
                onChange={() => onRatingChange(rowId, star)}
                disabled={disabled}
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
          onChange={(e) => onCommentChange(rowId, e.target.value)}
          disabled={disabled}
          rows={2}
        />
      </div>
    </td>
  );
};

export default RatingCell; 