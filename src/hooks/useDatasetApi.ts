import { useState, useCallback, useRef } from 'react';
import { DatasetRow, ApiConfig } from '../types';
import { getCodeFromUrl } from '../utils/urlHelpers';

const API_BASE_URL = 'https://e7zf4xjf2k.execute-api.us-east-1.amazonaws.com/prod';

export const useDatasetApi = () => {
  const [dataset, setDataset] = useState<DatasetRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  
  // Add refs to track loading state and prevent duplicate calls
  const isLoadingRef = useRef<boolean>(false);
  const hasLoadedRef = useRef<boolean>(false);

  // Memoize API config function - this should be stable
  const apiConfig = useCallback((): ApiConfig => {
    const codeFromUrl = getCodeFromUrl();
    const apiEndpoint = '/v1/getDataset';
    const apiKey = process.env.REACT_APP_API_KEY;
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    return {
      baseUrl: API_BASE_URL,
      endpoint: apiEndpoint,
      headers,
      method: 'POST',
      body: {
        fileCode: codeFromUrl
      }
    };
  }, []);

  // Helper function to safely convert values to the expected types
  const convertToDatasetValue = (value: unknown): string | number | boolean => {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    // Convert other types to string
    return String(value);
  };

  // Optimized transform function
  const transformApiResponse = useCallback((data: any[]): DatasetRow[] => {
    if (!Array.isArray(data)) {
      throw new Error('API response is not an array');
    }

    console.log(`Transforming ${data.length} raw items`);

    // Simple deduplication without expensive JSON.stringify
    const seenItems = new Set<string>();
    const uniqueData: any[] = [];
    
    for (const item of data) {
      // Create a simple hash instead of full JSON.stringify
      const hash = Object.keys(item).sort().map(key => `${key}:${item[key]}`).join('|');
      if (!seenItems.has(hash)) {
        seenItems.add(hash);
        uniqueData.push(item);
      }
    }
    
    if (uniqueData.length !== data.length) {
      console.warn(`Removed ${data.length - uniqueData.length} duplicate items`);
    }

    // Single pass transformation with proper type conversion
    const transformedData: DatasetRow[] = uniqueData.map((item, index) => {
      const transformedItem: DatasetRow = { id: index + 1 };
      
      for (const [key, value] of Object.entries(item)) {
        if (key !== 'id') {
          transformedItem[key] = convertToDatasetValue(value);
        }
      }

      return transformedItem;
    });

    console.log(`Transformed into ${transformedData.length} unique items`);
    return transformedData;
  }, []);

  const fetchDataWithRetry = useCallback(async (maxRetries: number = 3): Promise<{ dataset: DatasetRow[], overallComment?: string }> => {
    // Prevent duplicate calls
    if (isLoadingRef.current) {
      console.log('Already loading, skipping duplicate call');
      return { dataset: [], overallComment: '' };
    }

    isLoadingRef.current = true;
    
    try {
      const config = apiConfig();
      const url = `${config.baseUrl}${config.endpoint}`;
      const codeFromUrl = getCodeFromUrl();
      
      console.log(`Fetching data from: ${url} with code: ${codeFromUrl}`);
      
      const requestOptions: RequestInit = {
        method: config.method || 'GET',
        headers: config.headers,
        mode: 'cors',
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
      const transformData = data.data.dataset ? data.data.dataset : data.data;
      const overallComment = data.data.overallComment || '';
      
      console.log(`Raw API response structure:`, {
        hasDataProperty: !!data.data,
        hasDatasetProperty: !!(data.data && data.data.dataset),
        transformDataLength: transformData?.length,
        hasOverallComment: !!overallComment
      });
      
      const transformedData = transformApiResponse(transformData);
      
      return { dataset: transformedData, overallComment };
    } finally {
      isLoadingRef.current = false;
    }
  }, [apiConfig, transformApiResponse]);

  const loadDataset = useCallback(async () => {
    // Prevent duplicate calls if already loaded
    if (hasLoadedRef.current && dataset.length > 0) {
      console.log('Dataset already loaded, skipping...');
      return { dataset, overallComment: '' };
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchDataWithRetry(3);
      
      const ids = result.dataset.map(row => row.id);
      const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        console.error('CRITICAL: Duplicate IDs in final dataset:', duplicateIds);
      }
      
      setDataset(result.dataset);
      hasLoadedRef.current = true;
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to load dataset:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchDataWithRetry]);

  const saveDataset = useCallback(async (updatedDataset: DatasetRow[], overallComment?: string) => {
    setSaving(true);
    
    try {
      const codeFromUrl = getCodeFromUrl();
      
      const response = await fetch(`${API_BASE_URL}/v1/saveDataset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          dataset: updatedDataset,
          fileCode: codeFromUrl,
          overallComment: overallComment || '',
          clientId: 'test'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save ratings');
      }

      const result = await response.json();
      setDataset(updatedDataset);
      
      console.log('All ratings and overall comment saved successfully:', result);
      return result;
    } catch (error) {
      console.error('Error saving ratings:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  }, []);

  // Reset function for URL changes
  const resetDataset = useCallback(() => {
    hasLoadedRef.current = false;
    isLoadingRef.current = false;
    setDataset([]);
    setLoading(true);
    setError(null);
  }, []);

  return {
    dataset,
    loading,
    error,
    saving,
    loadDataset,
    saveDataset,
    resetDataset,
    apiConfig
  };
}; 