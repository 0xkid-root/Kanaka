import { useState, useEffect, useCallback } from 'react';
import { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { request } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

interface UseApiOptions<T> {
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  immediate?: boolean;
  showErrorNotification?: boolean;
  errorMessage?: string;
}

interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

export function useApi<T = any>(
  config: AxiosRequestConfig,
  options: UseApiOptions<T> = {}
) {
  const { 
    initialData = null, 
    onSuccess, 
    onError, 
    immediate = true,
    showErrorNotification = true,
    errorMessage = 'An error occurred while fetching data'
  } = options;
  
  const { addNotification } = useNotification();
  const [state, setState] = useState<UseApiState<T>>({
    data: initialData,
    isLoading: immediate,
    error: null,
  });

  const execute = useCallback(async (overrideConfig?: AxiosRequestConfig) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const mergedConfig = { ...config, ...overrideConfig };
      const response: AxiosResponse<T> = await request(mergedConfig);
      
      setState({ data: response.data, isLoading: false, error: null });
      
      if (onSuccess) {
        onSuccess(response.data);
      }
      
      return response;
    } catch (err) {
      const error = err as AxiosError;
      const errorObj = new Error(
        error.response?.data?.message || error.message || 'Unknown error'
      );
      
      setState(prev => ({ ...prev, isLoading: false, error: errorObj }));
      
      if (onError) {
        onError(errorObj);
      }
      
      if (showErrorNotification) {
        addNotification({
          type: 'error',
          title: 'Error',
          message: errorObj.message || errorMessage,
        });
      }
      
      throw errorObj;
    }
  }, [config, onSuccess, onError, showErrorNotification, errorMessage, addNotification]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    ...state,
    execute,
    refetch: execute,
  };
}