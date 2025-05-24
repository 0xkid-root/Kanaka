import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  AuthState, 
  UserProfile 
} from '../types/authTypes';
import { 
  Proposal, 
  ProposalDetail, 
  Vote 
} from '../types/governanceTypes';
import { 
  Vault, 
  VaultDetail, 
  PoolBalance 
} from '../types/vaultTypes';
import { 
  PoolWeight, 
  YieldHarvest 
} from '../types/yieldTypes';
import { 
  AnalyticsMetrics, 
  PoolMetrics 
} from '../types/analyticsTypes';

interface AppState {
  // Auth state
  auth: AuthState;
  setAuth: (auth: Partial<AuthState>) => void;
  setUser: (user: UserProfile | null) => void;
  logout: () => void;
  
  // Governance state
  proposals: Proposal[];
  selectedProposal: ProposalDetail | null;
  votes: Vote[];
  setProposals: (proposals: Proposal[]) => void;
  setSelectedProposal: (proposal: ProposalDetail | null) => void;
  setVotes: (votes: Vote[]) => void;
  
  // Vault state
  vaults: Vault[];
  selectedVault: VaultDetail | null;
  userBalances: Record<string, PoolBalance>;
  setVaults: (vaults: Vault[]) => void;
  setSelectedVault: (vault: VaultDetail | null) => void;
  setUserBalance: (poolId: string, balance: PoolBalance) => void;
  
  // Yield Engine state
  poolWeights: PoolWeight[];
  yieldHarvests: YieldHarvest[];
  setPoolWeights: (poolWeights: PoolWeight[]) => void;
  setYieldHarvests: (yieldHarvests: YieldHarvest[]) => void;
  
  // Analytics state
  metrics: AnalyticsMetrics | null;
  poolMetrics: PoolMetrics[];
  setMetrics: (metrics: AnalyticsMetrics) => void;
  setPoolMetrics: (poolMetrics: PoolMetrics[]) => void;
  
  // UI state
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth state
      auth: {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      },
      setAuth: (auth) => set((state) => ({ auth: { ...state.auth, ...auth } })),
      setUser: (user) => set((state) => ({ auth: { ...state.auth, user } })),
      logout: () => set((state) => ({ 
        auth: { 
          ...state.auth, 
          isAuthenticated: false, 
          user: null, 
          error: null 
        } 
      })),
      
      // Governance state
      proposals: [],
      selectedProposal: null,
      votes: [],
      setProposals: (proposals) => set({ proposals }),
      setSelectedProposal: (proposal) => set({ selectedProposal: proposal }),
      setVotes: (votes) => set({ votes }),
      
      // Vault state
      vaults: [],
      selectedVault: null,
      userBalances: {},
      setVaults: (vaults) => set({ vaults }),
      setSelectedVault: (vault) => set({ selectedVault: vault }),
      setUserBalance: (poolId, balance) => set((state) => ({ 
        userBalances: { 
          ...state.userBalances, 
          [poolId]: balance 
        } 
      })),
      
      // Yield Engine state
      poolWeights: [],
      yieldHarvests: [],
      setPoolWeights: (poolWeights) => set({ poolWeights }),
      setYieldHarvests: (yieldHarvests) => set({ yieldHarvests }),
      
      // Analytics state
      metrics: null,
      poolMetrics: [],
      setMetrics: (metrics) => set({ metrics }),
      setPoolMetrics: (poolMetrics) => set({ poolMetrics }),
      
      // UI state
      isDarkMode: false,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
    }),
    {
      name: 'kanaka-storage',
      partialize: (state) => ({
        auth: { isAuthenticated: state.auth.isAuthenticated, user: state.auth.user },
        isDarkMode: state.isDarkMode,
      }),
    }
  )
);