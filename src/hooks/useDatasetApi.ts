import { useState, useCallback } from 'react';
import { DatasetRow, ApiConfig } from '../types';
import { getCodeFromUrl } from '../utils/urlHelpers';

const API_BASE_URL = 'https://e7zf4xjf2k.execute-api.us-east-1.amazonaws.com/prod';

export const useDatasetApi = () => {
  const [dataset, setDataset] = useState<DatasetRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // API Configuration
  const apiConfig = (): ApiConfig => {
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
  };

  // Transform API response to match our DatasetRow format
  const transformApiResponse = (data: any[]): DatasetRow[] => {
    if (!Array.isArray(data)) {
      throw new Error('API response is not an array');
    }

    console.log(`Transforming ${data.length} raw items`);

    // Remove exact duplicates first
    const uniqueData = data.filter((item, index, self) => 
      self.findIndex(other => JSON.stringify(other) === JSON.stringify(item)) === index
    );
    
    if (uniqueData.length !== data.length) {
      console.warn(`Removed ${data.length - uniqueData.length} exact duplicate items`);
    }

    const dataWithIds = uniqueData.map((item, index) => {
      let uniqueId = index + 1;
      return { ...item, id: uniqueId };
    });

    const transformedData = dataWithIds.map((item, index) => {
      const transformedItem: DatasetRow = { id: item.id };
      
      Object.keys(item).forEach(key => {
        if (key !== 'id') {
          const value = item[key];
          if (typeof value === 'object' && value !== null) {
            transformedItem[key] = JSON.stringify(value);
          } else {
            transformedItem[key] = value;
          }
        }
      });

      return transformedItem;
    });

    console.log(`Transformed into ${transformedData.length} unique items`);
    return transformedData;
  };

  const fetchDataWithRetry = useCallback(async (maxRetries: number = 3): Promise<DatasetRow[]> => {
    const config = apiConfig();
    const url = `${config.baseUrl}${config.endpoint}`;
    const codeFromUrl = getCodeFromUrl();
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Fetching data from: ${url} with code: ${codeFromUrl} (Attempt ${attempt}/${maxRetries})`);
        
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
        
        console.log(`Raw API response structure:`, {
          hasDataProperty: !!data.data,
          hasDatasetProperty: !!(data.data && data.data.dataset),
          transformDataLength: transformData?.length,
          firstTwoItems: transformData?.slice(0, 2)
        });
        
        const transformedData = transformApiResponse(transformData);
        
        const ids = transformedData.map(row => row.id);
        const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
        if (duplicateIds.length > 0) {
          console.warn('Duplicate IDs found after transformation:', duplicateIds);
        }
        
        return transformedData;
        
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          if (error instanceof TypeError && error.message.includes('CORS')) {
            throw new Error(`CORS Error: Unable to fetch from ${url}. This may be due to CORS restrictions.`);
          }
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    throw new Error('Max retries exceeded');
  }, []);

  const loadDataset = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchDataWithRetry(3);
      
      const ids = data.map(row => row.id);
      const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        console.error('CRITICAL: Duplicate IDs in final dataset:', duplicateIds);
      }
      
      setDataset(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to load dataset:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchDataWithRetry]);

  const saveDataset = useCallback(async (updatedDataset: DatasetRow[]) => {
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
          clientId: 'test'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save ratings');
      }

      const result = await response.json();
      setDataset(updatedDataset);
      
      console.log('All ratings saved successfully:', result);
      return result;
    } catch (error) {
      console.error('Error saving ratings:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    dataset,
    loading,
    error,
    saving,
    loadDataset,
    saveDataset,
    apiConfig
  };
}; 