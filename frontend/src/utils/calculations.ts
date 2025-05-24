import { ethers } from 'ethers';

/**
 * Calculate APY from periodic yield
 * @param yield The yield amount
 * @param principal The principal amount
 * @param periodDays The period in days
 * @returns The annualized APY as a percentage
 */
export const calculateApy = (
  yieldAmount: string | number,
  principal: string | number,
  periodDays: number
): number => {
  const yieldValue = typeof yieldAmount === 'string' ? parseFloat(yieldAmount) : yieldAmount;
  const principalValue = typeof principal === 'string' ? parseFloat(principal) : principal;
  
  if (principalValue === 0) return 0;
  
  const periodsPerYear = 365 / periodDays;
  const periodicRate = yieldValue / principalValue;
  
  // APY = (1 + r)^n - 1
  const apy = Math.pow(1 + periodicRate, periodsPerYear) - 1;
  
  // Convert to percentage
  return apy * 100;
};

/**
 * Calculate the weighted average APY
 * @param apys Array of APYs
 * @param weights Array of weights corresponding to each APY
 * @returns The weighted average APY
 */
export const calculateWeightedAverageApy = (
  apys: number[],
  weights: number[]
): number => {
  if (apys.length !== weights.length || apys.length === 0) {
    return 0;
  }
  
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  
  if (totalWeight === 0) {
    return 0;
  }
  
  const weightedSum = apys.reduce(
    (sum, apy, index) => sum + apy * weights[index],
    0
  );
  
  return weightedSum / totalWeight;
};

/**
 * Calculate the value in USD
 * @param amount The amount in wei
 * @param price The price of the token in USD
 * @returns The value in USD
 */
export const calculateUsdValue = (
  amount: string | ethers.BigNumber,
  price: number
): number => {
  const amountInEther = parseFloat(ethers.utils.formatEther(amount));
  return amountInEther * price;
};

/**
 * Calculate the percentage change between two values
 * @param currentValue The current value
 * @param previousValue The previous value
 * @returns The percentage change
 */
export const calculatePercentageChange = (
  currentValue: number,
  previousValue: number
): number => {
  if (previousValue === 0) return 0;
  
  return ((currentValue - previousValue) / previousValue) * 100;
};

/**
 * Calculate the impermanent loss
 * @param priceRatio The ratio of current price to initial price
 * @returns The impermanent loss as a percentage
 */
export const calculateImpermanentLoss = (priceRatio: number): number => {
  if (priceRatio <= 0) return 0;
  
  const sqrtRatio = Math.sqrt(priceRatio);
  const impermanentLoss = (2 * sqrtRatio) / (1 + priceRatio) - 1;
  
  // Convert to percentage
  return impermanentLoss * 100;
};