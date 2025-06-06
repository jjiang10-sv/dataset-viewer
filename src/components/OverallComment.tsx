import React from 'react';

interface OverallCommentProps {
  comment: string;
  onCommentChange: (comment: string) => void;
  disabled?: boolean;
}

const OverallComment: React.FC<OverallCommentProps> = ({
  comment,
  onCommentChange,
  disabled = false
}) => {
  return (
    <div className="overall-comment-section">
      <h2>💬 Overall Comments</h2>
      <div className="overall-comment-container">
        <label htmlFor="overall-comment" className="overall-comment-label">
          Add your overall thoughts about this dataset:
        </label>
        <textarea
          id="overall-comment"
          className="overall-comment-input"
          placeholder="Share your thoughts about the overall quality, usefulness, or any general observations about this dataset..."
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          disabled={disabled}
          rows={4}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: '100px'
          }}
        />
        <div className="overall-comment-help">
          <small style={{ color: '#6c757d' }}>
            This comment will be saved with the dataset and represents your overall assessment.
          </small>
        </div>
      </div>
    </div>
  );
};

export default OverallComment; 