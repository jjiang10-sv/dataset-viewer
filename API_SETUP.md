# Third-Party API Integration Setup

The `DatasetViewer` component has been updated to fetch data from third-party APIs instead of local JSON files. This guide explains how to configure and use this functionality.

## Configuration

### Environment Variables

Create a `.env` file in your project root with the following variables:

```bash
# Required: Base URL of the third-party API
REACT_APP_API_BASE_URL=https://jsonplaceholder.typicode.com

# Required: API endpoint path
REACT_APP_API_ENDPOINT=/posts

# Optional: API Key for authentication
REACT_APP_API_KEY=your_api_key_here
```

### API Configuration Examples

#### 1. JSONPlaceholder (Default - for testing)
```bash
REACT_APP_API_BASE_URL=https://jsonplaceholder.typicode.com
REACT_APP_API_ENDPOINT=/posts
```

#### 2. REST API with Authentication
```bash
REACT_APP_API_BASE_URL=https://api.example.com
REACT_APP_API_ENDPOINT=/v1/dataset
REACT_APP_API_KEY=your_bearer_token_here
```

#### 3. GitHub API
```bash
REACT_APP_API_BASE_URL=https://api.github.com
REACT_APP_API_ENDPOINT=/repos/owner/repo/issues
REACT_APP_API_KEY=github_token_here
```

#### 4. Custom Mock API
```bash
REACT_APP_API_BASE_URL=https://my-json-server.typicode.com/username/repo
REACT_APP_API_ENDPOINT=/data
```

## Features

### ✅ Automatic Retries
- Implements exponential backoff for failed requests
- Up to 3 retry attempts with increasing delays
- Automatic error recovery for transient failures

### ✅ CORS Handling
- Proper CORS configuration
- Helpful error messages for CORS issues
- Suggestions for resolving common CORS problems

### ✅ Authentication Support
- Bearer token authentication via `Authorization` header
- Alternative API key authentication via `X-API-Key` header
- Configurable through environment variables

### ✅ Error Handling
- Comprehensive error display with troubleshooting tips
- Manual retry functionality
- API configuration display for debugging

### ✅ Data Transformation
- Automatic conversion of API responses to internal format
- Handles various data structures and types
- Ensures all rows have unique IDs

## API Response Format

Your API should return an array of objects. Each object will be treated as a row in the dataset:

```json
[
  {
    "id": 1,
    "title": "Sample Title",
    "body": "Sample content",
    "userId": 1
  },
  {
    "id": 2,
    "title": "Another Title", 
    "body": "More content",
    "userId": 2
  }
]
```

## Troubleshooting

### CORS Issues
If you encounter CORS errors:

1. **For development**: Use a proxy server or browser extension to bypass CORS
2. **For production**: Ensure the API server includes proper CORS headers
3. **Alternative**: Use a CORS proxy service like `https://cors-anywhere.herokuapp.com/`

### Authentication Errors
- Verify your API key is correct and has proper permissions
- Check if the API expects the key in a different header format
- Ensure the API key hasn't expired

### Network Issues
- Check your internet connection
- Verify the API endpoint URL is correct and accessible
- Test the API directly using tools like Postman or curl

### Data Format Issues
- Ensure the API returns an array of objects
- Check that each object has consistent field names
- Verify data types are compatible (strings, numbers, booleans)

## Advanced Configuration

### Custom Headers
Modify the `getApiConfig()` function in `DatasetViewer.tsx` to add custom headers:

```javascript
const headers: Record<string, string> = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'Custom-Header': 'custom-value'
};
```

### POST Requests
To send POST requests with a body, update the API configuration:

```javascript
return {
  baseUrl: apiBaseUrl,
  endpoint: apiEndpoint,
  headers,
  method: 'POST',
  body: { query: 'your_query_parameters' }
};
```

### Response Transformation
Customize the `transformApiResponse()` function to handle specific API response formats:

```javascript
const transformApiResponse = (data: any[]): DatasetRow[] => {
  // Custom transformation logic here
  return data.map((item, index) => {
    // Your custom transformation
    return {
      id: item.custom_id || index,
      // Map other fields as needed
    };
  });
};
```

## Testing

1. Start with the default JSONPlaceholder configuration
2. Verify the app loads data successfully
3. Test the retry functionality by temporarily using an invalid URL
4. Configure with your actual API endpoints
5. Test authentication if required

## Security Notes

- Never commit `.env` files containing real API keys to version control
- Use environment-specific configuration for different deployment stages
- Consider using secure storage for sensitive API credentials
- Implement proper API rate limiting to avoid hitting API quotas 