import { ethers } from 'ethers';

/**
 * Validate an Ethereum address
 */
export const isValidAddress = (address: string): boolean => {
  try {
    return ethers.utils.isAddress(address);
  } catch (error) {
    return false;
  }
};

/**
 * Validate an amount is a valid number and greater than 0
 */
export const isValidAmount = (amount: string): boolean => {
  try {
    const value = ethers.utils.parseEther(amount);
    return value.gt(0);
  } catch (error) {
    return false;
  }
};

/**
 * Validate a string is not empty
 */
export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Validate a string has a minimum length
 */
export const hasMinLength = (value: string, minLength: number): boolean => {
  return value.trim().length >= minLength;
};

/**
 * Validate a string has a maximum length
 */
export const hasMaxLength = (value: string, maxLength: number): boolean => {
  return value.trim().length <= maxLength;
};

/**
 * Validate an email address
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate a URL
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validate a transaction hash
 */
export const isValidTxHash = (hash: string): boolean => {
  const txHashRegex = /^0x([A-Fa-f0-9]{64})$/;
  return txHashRegex.test(hash);
};