// API configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  TIMEOUT: 10000,
};

// Starknet configuration
export const STARKNET_CONFIG = {
  NETWORK: process.env.NEXT_PUBLIC_STARKNET_NETWORK || 'goerli-alpha',
  EXPLORER_URL: 'https://goerli.voyager.online',
};

// Authentication configuration
export const AUTH_CONFIG = {
  TOKEN_KEY: 'auth_token',
  TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
};

// Feature flags
export const FEATURES = {
  GOVERNANCE: true,
  VAULTS: true,
  ANALYTICS: true,
  YIELD_ENGINE: true,
  SOCIAL: false,
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_LIMIT: 10,
  DEFAULT_OFFSET: 0,
  PAGE_SIZE_OPTIONS: [5, 10, 25, 50, 100],
};

// Time periods for analytics
export const TIME_PERIODS = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
};

// Contract addresses
export const CONTRACTS = {
  GOVERNANCE: process.env.NEXT_PUBLIC_GOVERNANCE_CONTRACT,
  VAULT_MANAGER: process.env.NEXT_PUBLIC_VAULT_MANAGER_CONTRACT,
  YIELD_ENGINE: process.env.NEXT_PUBLIC_YIELD_ENGINE_CONTRACT,
  TOKEN: process.env.NEXT_PUBLIC_TOKEN_CONTRACT,
};

// Routes
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  GOVERNANCE: {
    ROOT: '/governance',
    PROPOSALS: '/governance/proposals',
    PROPOSAL_DETAIL: (id: number) => `/governance/proposals/${id}`,
    CREATE_PROPOSAL: '/governance/create',
    VOTING: '/governance/voting',
  },
  VAULTS: {
    ROOT: '/vaults',
    VAULT_DETAIL: (id: string) => `/vaults/${id}`,
    DEPOSIT: '/vaults/deposit',
    WITHDRAW: '/vaults/withdraw',
  },
  ANALYTICS: {
    ROOT: '/analytics',
    YIELD: '/analytics/yield',
    POOLS: '/analytics/pools',
    USERS: '/analytics/users',
  },
  SETTINGS: '/settings',
  LOGIN: '/login',
  PROFILE: '/profile',
};