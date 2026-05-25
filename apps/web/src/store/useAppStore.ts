import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  pan: string;
  mobile: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

export interface BureauLoan {
  id: number;
  lender: string;
  accountType: string;
  accountNumber: string;
  sanctionAmount: number;
  outstanding: number;
  emi: number;
  rate: number;
  dpd: number;
  closureMonths: number;
  isEdited?: boolean;
}

export interface BureauState {
  loans: BureauLoan[];
  cibilScore: number;
  fetched: boolean;
}

export interface ProfileState {
  income: number;
  employment: 'salaried' | 'self-employed' | 'business' | '';
  ownHouse: boolean | null;
  houseValue: number;
  hasShop: boolean | null;
  shopValue: number;
  hasOtherProp: boolean | null;
  otherPropValue: number;
}

export interface LoanFees {
  pf: number; // processing fee %
  fc: number; // foreclosure charge %
}

export interface Strategy {
  id: number;
  tag: 'BT' | 'TOPUP' | 'PARTIAL' | 'CLOSURE' | 'LAP' | 'CONSOLIDATE';
  title: string;
  reason: string;
  fromLoan?: {
    lender: string;
    rate: number;
    outstanding: number;
  };
  toLoan?: {
    lender: string;
    rate: number;
    amount: number;
  };
  monthlyEmiFreed: number;
  totalInterestSaved: number;
  lumpSumAvailable: number;
  netSaving: number;
  conflictsWith: number[];
  fees?: LoanFees;
  eligibility: string;
  recommendation: string;
  loanIds: number[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface AppStore {
  // Auth
  auth: AuthState;
  setAuth: (auth: Partial<AuthState>) => void;
  logout: () => void;

  // Bureau
  bureau: BureauState;
  setBureauLoans: (loans: BureauLoan[]) => void;
  updateLoan: (id: number, updates: Partial<BureauLoan>) => void;
  setCibilScore: (score: number) => void;
  setBureauFetched: (fetched: boolean) => void;

  // Profile
  profile: ProfileState;
  setProfile: (updates: Partial<ProfileState>) => void;

  // Loan Fees
  loanFees: Record<number, LoanFees>;
  setLoanFees: (strategyId: number, fees: LoanFees) => void;

  // Strategies
  strategies: Strategy[];
  setStrategies: (strategies: Strategy[]) => void;
  selectedStrategyIds: number[];
  toggleStrategy: (id: number) => void;
  clearSelectedStrategies: () => void;

  // Chat
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  chatMessages: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ── Auth ─────────────────────────────────────────────────────────────
      auth: {
        token: null,
        user: null,
        isAuthenticated: false,
      },
      setAuth: (auth) =>
        set((s) => ({ auth: { ...s.auth, ...auth } })),
      logout: () =>
        set({
          auth: { token: null, user: null, isAuthenticated: false },
          bureau: { loans: [], cibilScore: 0, fetched: false },
          selectedStrategyIds: [],
          chatMessages: [],
        }),

      // ── Bureau ────────────────────────────────────────────────────────────
      bureau: {
        loans: [],
        cibilScore: 0,
        fetched: false,
      },
      setBureauLoans: (loans) =>
        set((s) => ({ bureau: { ...s.bureau, loans } })),
      updateLoan: (id, updates) =>
        set((s) => ({
          bureau: {
            ...s.bureau,
            loans: s.bureau.loans.map((l) =>
              l.id === id ? { ...l, ...updates, isEdited: true } : l
            ),
          },
        })),
      setCibilScore: (cibilScore) =>
        set((s) => ({ bureau: { ...s.bureau, cibilScore } })),
      setBureauFetched: (fetched) =>
        set((s) => ({ bureau: { ...s.bureau, fetched } })),

      // ── Profile ───────────────────────────────────────────────────────────
      profile: {
        income: 0,
        employment: '',
        ownHouse: null,
        houseValue: 0,
        hasShop: null,
        shopValue: 0,
        hasOtherProp: null,
        otherPropValue: 0,
      },
      setProfile: (updates) =>
        set((s) => ({ profile: { ...s.profile, ...updates } })),

      // ── Loan Fees ─────────────────────────────────────────────────────────
      loanFees: {},
      setLoanFees: (strategyId, fees) =>
        set((s) => ({ loanFees: { ...s.loanFees, [strategyId]: fees } })),

      // ── Strategies ────────────────────────────────────────────────────────
      strategies: [],
      setStrategies: (strategies) => set({ strategies }),
      selectedStrategyIds: [],
      toggleStrategy: (id) =>
        set((s) => {
          const strategy = s.strategies.find((st) => st.id === id);
          if (!strategy) return s;

          const isSelected = s.selectedStrategyIds.includes(id);
          if (isSelected) {
            // Deselect
            return { selectedStrategyIds: s.selectedStrategyIds.filter((sid) => sid !== id) };
          }

          // Auto-deselect conflicting strategies and add this one
          // (better UX than blocking — user's intent is clear)
          const conflicts = new Set(strategy.conflictsWith || []);
          const next = s.selectedStrategyIds.filter((sid) => !conflicts.has(sid));
          return { selectedStrategyIds: [...next, id] };
        }),
      clearSelectedStrategies: () => set({ selectedStrategyIds: [] }),

      // ── Chat ──────────────────────────────────────────────────────────────
      chatOpen: false,
      setChatOpen: (chatOpen) => set({ chatOpen }),
      chatMessages: [],
      addChatMessage: (message) =>
        set((s) => ({ chatMessages: [...s.chatMessages, message] })),
      clearChat: () => set({ chatMessages: [] }),
    }),
    {
      name: 'finfinity-bre-store',
      partialize: (s) => ({
        auth: s.auth,
        bureau: s.bureau,
        profile: s.profile,
        loanFees: s.loanFees,
        strategies: s.strategies,
        selectedStrategyIds: s.selectedStrategyIds,
      }),
    }
  )
);
