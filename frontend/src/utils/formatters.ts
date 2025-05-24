import { ethers } from 'ethers';

/**
 * Format an address to a shortened form
 */
export const formatAddress = (address: string | null | undefined): string => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

/**
 * Format a timestamp to a readable date
 */
export const formatDate = (timestamp: number | string): string => {
  if (typeof timestamp === 'string') {
    // Check if it's a unix timestamp in seconds (string)
    if (/^\d{10}$/.test(timestamp)) {
      timestamp = parseInt(timestamp) * 1000;
    } else {
      // Assume it's an ISO date string
      return new Date(timestamp).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } else if (timestamp < 10000000000) {
    // Convert from seconds to milliseconds if needed
    timestamp = timestamp * 1000;
  }
  
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format a number to a currency string
 */
export const formatCurrency = (
  value: string | number,
  currency = 'USD',
  decimals = 2
): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numValue);
};

/**
 * Format a percentage
 */
export const formatPercent = (value: number, decimals = 2): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format a big number from wei to ether
 */
export const formatEther = (wei: string | ethers.BigNumber): string => {
  return ethers.utils.formatEther(wei);
};

/**
 * Format a number to a compact string (e.g., 1.2k, 1.2M)
 */
export const formatCompact = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value);
};

/**
 * Format a duration in seconds to a readable string
 */
export const formatDuration = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};