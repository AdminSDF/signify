
// Default Game Settings - These serve as fallbacks or initial structure
export const DEFAULT_APP_NAME = "Spinify";
export const DEFAULT_UPI_ID = "9828786246@jio";
export const DEFAULT_SPIN_REFILL_PRICE = 10;
export const DEFAULT_MAX_SPINS_IN_BUNDLE = 10;
export const DEFAULT_INITIAL_BALANCE_FOR_NEW_USERS = 50.00;
export const DEFAULT_TIER1_LIMIT = 30;
export const DEFAULT_TIER1_COST = 2;
export const DEFAULT_TIER2_LIMIT = 60;
export const DEFAULT_TIER2_COST = 3;
export const DEFAULT_TIER3_COST = 5;
export const DEFAULT_MIN_WITHDRAWAL_AMOUNT = 500;
export const DEFAULT_MIN_ADD_BALANCE_AMOUNT = 100;
export const DEFAULT_NEWS_TICKER_SPEED = 60; // Default speed in seconds

// Default News Items - Fallback
export const DEFAULT_NEWS_ITEMS: string[] = [
  "🎉 Welcome to Spinify! Loading latest news...",
  "🔥 Hot Prize Alert! Check the wheel for big wins!",
  "✨ Spin more, win more! Good luck!",
];

export interface AppSettings {
  appName: string;
  upiId: string;
  spinRefillPrice: number;
  maxSpinsInBundle: number;
  initialBalanceForNewUsers: number;
  tier1Limit: number;
  tier1Cost: number;
  tier2Limit: number;
  tier2Cost: number;
  tier3Cost: number;
  minWithdrawalAmount: number;
  minAddBalanceAmount: number;
  newsTickerSpeed: number;
}

// This is the initial structure / fallback if Firestore is unavailable.
// The actual settings will be fetched from Firestore via AuthContext.
export const initialSettings: AppSettings = {
  appName: DEFAULT_APP_NAME,
  upiId: DEFAULT_UPI_ID,
  spinRefillPrice: DEFAULT_SPIN_REFILL_PRICE,
  maxSpinsInBundle: DEFAULT_MAX_SPINS_IN_BUNDLE,
  initialBalanceForNewUsers: DEFAULT_INITIAL_BALANCE_FOR_NEW_USERS,
  tier1Limit: DEFAULT_TIER1_LIMIT,
  tier1Cost: DEFAULT_TIER1_COST,
  tier2Limit: DEFAULT_TIER2_LIMIT,
  tier2Cost: DEFAULT_TIER2_COST,
  tier3Cost: DEFAULT_TIER3_COST,
  minWithdrawalAmount: DEFAULT_MIN_WITHDRAWAL_AMOUNT,
  minAddBalanceAmount: DEFAULT_MIN_ADD_BALANCE_AMOUNT,
  newsTickerSpeed: DEFAULT_NEWS_TICKER_SPEED,
};

// NewsItem type can be defined if news items have more structure,
// for now, assuming string array.
export type NewsItem = string; 

export const ADMIN_EMAIL_CONFIG_KEY = 'adminUserEmail';
export const DEFAULT_ADMIN_EMAIL = "jameafaizanrasool@gmail.com";

    
