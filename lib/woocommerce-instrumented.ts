/**
 * Instrumented WooCommerce API Client
 * 
 * Wraps wcAPI calls to track performance
 */

import wcAPI from './woocommerce';
import { fetchMonitor } from './monitoring/fetch-instrumentation';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { hasAxiosResponse, getAxiosErrorDetails, getErrorMessage } from '@/lib/utils/errors';

const getRouteFromConfig = (config?: AxiosRequestConfig): string | undefined => {
  if (!config) {
    return undefined;
  }
  return (config as any).route || (config as any).__route || undefined;
};

/**
 * Instrumented wcAPI wrapper
 */
const instrumentedWcAPI = {
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    const startTime = Date.now();
    const route = getRouteFromConfig(config);
    const fullUrl = `${wcAPI.defaults.baseURL}${url}`;
    
    try {
      const response = await wcAPI.get<T>(url, config);
      const duration = Date.now() - startTime;
      
      fetchMonitor.track(
        fullUrl,
        'GET',
        duration,
        response.status,
        route,
        false,
        undefined
      );
      
      return response;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      let status: number | undefined;
      
      if (hasAxiosResponse(error)) {
        const details = getAxiosErrorDetails(error);
        status = details.status;
      }
      
      fetchMonitor.track(
        fullUrl,
        'GET',
        duration,
        status,
        route,
        false,
        getErrorMessage(error) || 'Unknown error'
      );
      
      throw error;
    }
  },

  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    const startTime = Date.now();
    const route = getRouteFromConfig(config);
    const fullUrl = `${wcAPI.defaults.baseURL}${url}`;
    
    try {
      const response = await wcAPI.post<T>(url, data, config);
      const duration = Date.now() - startTime;
      
      fetchMonitor.track(
        fullUrl,
        'POST',
        duration,
        response.status,
        route,
        false,
        undefined
      );
      
      return response;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      let status: number | undefined;
      
      if (hasAxiosResponse(error)) {
        const details = getAxiosErrorDetails(error);
        status = details.status;
      }
      
      fetchMonitor.track(
        fullUrl,
        'POST',
        duration,
        status,
        route,
        false,
        getErrorMessage(error) || 'Unknown error'
      );
      
      throw error;
    }
  },

  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    const startTime = Date.now();
    const route = getRouteFromConfig(config);
    const fullUrl = `${wcAPI.defaults.baseURL}${url}`;
    
    try {
      const response = await wcAPI.put<T>(url, data, config);
      const duration = Date.now() - startTime;
      
      fetchMonitor.track(
        fullUrl,
        'PUT',
        duration,
        response.status,
        route,
        false,
        undefined
      );
      
      return response;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      let status: number | undefined;
      
      if (hasAxiosResponse(error)) {
        const details = getAxiosErrorDetails(error);
        status = details.status;
      }
      
      fetchMonitor.track(
        fullUrl,
        'PUT',
        duration,
        status,
        route,
        false,
        getErrorMessage(error) || 'Unknown error'
      );
      
      throw error;
    }
  },

  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    const startTime = Date.now();
    const route = getRouteFromConfig(config);
    const fullUrl = `${wcAPI.defaults.baseURL}${url}`;
    
    try {
      const response = await wcAPI.delete<T>(url, config);
      const duration = Date.now() - startTime;
      
      fetchMonitor.track(
        fullUrl,
        'DELETE',
        duration,
        response.status,
        route,
        false,
        undefined
      );
      
      return response;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      let status: number | undefined;
      
      if (hasAxiosResponse(error)) {
        const details = getAxiosErrorDetails(error);
        status = details.status;
      }
      
      fetchMonitor.track(
        fullUrl,
        'DELETE',
        duration,
        status,
        route,
        false,
        getErrorMessage(error) || 'Unknown error'
      );
      
      throw error;
    }
  },
};

export default instrumentedWcAPI;

