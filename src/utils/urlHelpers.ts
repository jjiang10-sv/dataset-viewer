// Extract code from URL parameters
export const getCodeFromUrl = (): string => {
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

// Helper function to get consistent row ID across all operations
export const getRowId = (row: any, index: number, idColumn?: string): string | number => {
  let rowId: string | number = row.id;
  if (!rowId && idColumn) {
    const columnValue = row[idColumn];
    rowId = typeof columnValue === 'boolean' ? index : columnValue;
  }
  if (!rowId) {
    rowId = index;
  }
  // Ensure rowId is string or number, not boolean
  return typeof rowId === 'boolean' ? index : rowId;
}; 