import React from 'react';
import { DatasetRow, RowRating } from '../types';
import { getRowId } from '../utils/urlHelpers';
import RatingCell from './RatingCell';

interface DatasetTableProps {
  data: DatasetRow[];
  columns: string[];
  rowRatings: Map<string | number, RowRating>;
  onRatingChange: (rowId: string | number, rating: number) => void;
  onCommentChange: (rowId: string | number, comment: string) => void;
  saving?: boolean;
  startIndex?: number;
}

const DatasetTable: React.FC<DatasetTableProps> = ({
  data,
  columns,
  rowRatings,
  onRatingChange,
  onCommentChange,
  saving = false,
  startIndex = 0
}) => {
  if (data.length === 0) {
    return <p>No data available</p>;
  }

  return (
    <div className="table-container">
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
          {data.map((row: DatasetRow, index: number) => {
            const actualIndex = startIndex + index;
            const safeRowId = getRowId(row, actualIndex, columns[0]);
            const uniqueKey = `row-${actualIndex}-${safeRowId}`;
            const currentRating = rowRatings.get(safeRowId);
            
            return (
              <tr key={uniqueKey}>
                {columns.map((column: string, colIndex: number) => (
                  <td key={`${uniqueKey}-col-${colIndex}-${column}`}>
                    {String(row[column])}
                  </td>
                ))}
                <RatingCell
                  rowId={safeRowId}
                  currentRating={currentRating}
                  onRatingChange={onRatingChange}
                  onCommentChange={onCommentChange}
                  disabled={saving}
                />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DatasetTable; 