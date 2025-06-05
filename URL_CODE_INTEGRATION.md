# URL Code Integration Guide

The DatasetViewer component now supports accepting dataset codes directly from the URL, making it easy to share links to specific datasets and dynamically load different data based on user input.

## How It Works

The component automatically extracts a code from the URL and passes it to both `getDataset` and `saveDataset` API calls through the `fileCode` parameter.

## Supported URL Formats

### 1. Query Parameter (Recommended)
```
https://your-domain.com/dataset-viewer?code=ABC123
```

### 2. Hash Parameter
```
https://your-domain.com/dataset-viewer#code=ABC123
```

### 3. Path Parameter
```
https://your-domain.com/dataset-viewer/ABC123
```

## Priority Order

The component checks for codes in this order:
1. **Query parameter** (`?code=ABC123`) - **Highest priority**
2. **Hash parameter** (`#code=ABC123`)
3. **Path parameter** (`/ABC123`)
4. **Default fallback** (`1234567890`) - Used if no code is found

## Usage Examples

### Basic Usage
```html
<!-- Load dataset with code "DATASET001" -->
<a href="?code=DATASET001">Load Dataset 001</a>

<!-- Load dataset with code "USER_DATA_2024" -->
<a href="?code=USER_DATA_2024">Load User Data 2024</a>
```

### JavaScript Navigation
```javascript
// Programmatically navigate to a dataset
function loadDataset(code) {
  const url = new URL(window.location);
  url.searchParams.set('code', code);
  window.location.href = url.toString();
}

// Example usage
loadDataset('SALES_Q4_2024');
```

### React Router Integration
```javascript
import { useNavigate } from 'react-router-dom';

function DatasetSelector() {
  const navigate = useNavigate();
  
  const loadDataset = (code) => {
    navigate(`/dataset-viewer?code=${code}`);
  };
  
  return (
    <div>
      <button onClick={() => loadDataset('DATASET_A')}>Load Dataset A</button>
      <button onClick={() => loadDataset('DATASET_B')}>Load Dataset B</button>
    </div>
  );
}
```

## API Integration

### getDataset API Call
When the component loads, it automatically calls:
```javascript
POST /v1/getDataset
{
  "fileCode": "ABC123" // Code from URL
}
```

### saveDataset API Call
When saving data, it automatically includes:
```javascript
POST /v1/saveDataset
{
  "dataset": [...], // Updated dataset with ratings/comments
  "fileCode": "ABC123", // Same code from URL
  "clientId": "test" // Optional backward compatibility
}
```

## User Interface Features

### Code Display
The component shows the current dataset code at the top:
```
Dataset Code: ABC123
To load a different dataset, add ?code=YOUR_CODE to the URL
```

### URL Change Detection
- Automatically reloads data when users navigate back/forward
- Clears previous ratings and comments when switching datasets
- Resets pagination to page 1

## Implementation Details

### Code Extraction Function
```javascript
const getCodeFromUrl = (): string => {
  const urlParams = new URLSearchParams(window.location.search);
  const codeFromQuery = urlParams.get('code');
  
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const codeFromHash = hashParams.get('code');
  
  const pathSegments = window.location.pathname.split('/');
  const codeFromPath = pathSegments[pathSegments.length - 1];
  
  return codeFromQuery || codeFromHash || 
    (codeFromPath !== 'dataset-viewer' && codeFromPath !== '' ? codeFromPath : '1234567890');
};
```

### Real-time URL Monitoring
```javascript
useEffect(() => {
  const handlePopState = () => {
    setRowRatings(new Map());
    setHasUnsavedChanges(false);
    setCurrentPage(1);
    window.location.reload();
  };

  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, []);
```

## Best Practices

### 1. URL-Friendly Codes
Use codes that work well in URLs:
- ✅ Good: `SALES_2024`, `USER_123`, `REPORT_Q4`
- ❌ Avoid: Spaces, special characters that need encoding

### 2. Error Handling
Always handle cases where the dataset code doesn't exist:
```javascript
// Your API should return appropriate errors for invalid codes
if (response.status === 404) {
  throw new Error(`Dataset with code '${code}' not found`);
}
```

### 3. Sharing Links
Generate shareable links for users:
```javascript
function generateShareableLink(code) {
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?code=${code}`;
}
```

### 4. Bookmarking Support
The URL-based approach automatically supports:
- Browser bookmarks
- Direct link sharing
- Browser history navigation

## Security Considerations

### Input Validation
Ensure your backend validates dataset codes:
```javascript
// Backend validation example
function validateDatasetCode(code) {
  if (!code || typeof code !== 'string') {
    throw new Error('Invalid dataset code');
  }
  
  if (!/^[A-Za-z0-9_-]+$/.test(code)) {
    throw new Error('Dataset code contains invalid characters');
  }
  
  if (code.length > 50) {
    throw new Error('Dataset code too long');
  }
  
  return true;
}
```

### Access Control
Implement proper authorization:
```javascript
// Check if user has access to this dataset
async function checkDatasetAccess(userId, datasetCode) {
  // Your authorization logic here
  return await hasPermission(userId, datasetCode);
}
```

## Troubleshooting

### Common Issues

1. **Code not being detected**
   - Check URL format matches supported patterns
   - Verify no URL encoding issues
   - Check browser console for errors

2. **Dataset not loading**
   - Verify the code exists in your backend
   - Check API response format
   - Review network tab for failed requests

3. **Save operation failing**
   - Ensure the same code is being sent to save endpoint
   - Verify user has write permissions for the dataset
   - Check backend logs for detailed errors

### Debug Information
The component logs helpful information:
```
Fetching data from: https://api.example.com/v1/getDataset with code: ABC123 (Attempt 1/3)
```

### Testing Different Codes
You can quickly test different codes by modifying the URL:
```
# Current URL
https://your-app.com/dataset-viewer?code=TEST001

# Change to different code
https://your-app.com/dataset-viewer?code=TEST002
```

## Migration from Static Codes

If you previously used hardcoded dataset identifiers:

### Before
```javascript
body: {
  fileCode: '1234567890' // Static code
}
```

### After
```javascript
body: {
  fileCode: getCodeFromUrl() // Dynamic code from URL
}
```

This change maintains backward compatibility while adding URL-based flexibility. 