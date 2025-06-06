import { useState, useCallback, useEffect } from 'react';
import { DatasetRow } from '../types';

const CHUNK_SIZE = 100; // Process 100 records at a time

export const useProgressiveLoading = () => {
  const [processedData, setProcessedData] = useState<DatasetRow[]>([]);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const processDataInChunks = useCallback(async (rawData: any[]): Promise<DatasetRow[]> => {
    setIsProcessing(true);
    setProcessingProgress(0);
    
    const processedChunks: DatasetRow[] = [];
    const totalChunks = Math.ceil(rawData.length / CHUNK_SIZE);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, rawData.length);
      const chunk = rawData.slice(start, end);
      
      // Process chunk
      const processedChunk = chunk.map((item, index) => ({
        id: start + index + 1,
        ...Object.fromEntries(
          Object.entries(item).filter(([key]) => key !== 'id')
        )
      }));
      
      processedChunks.push(...processedChunk);
      
      // Update progress
      const progress = ((i + 1) / totalChunks) * 100;
      setProcessingProgress(progress);
      
      // Allow UI to update
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    setProcessedData(processedChunks);
    setIsProcessing(false);
    return processedChunks;
  }, []);

  return {
    processedData,
    processingProgress,
    isProcessing,
    processDataInChunks
  };
}; 