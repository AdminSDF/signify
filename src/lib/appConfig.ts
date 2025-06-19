
'use client';

// Default Game Settings
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

// Default News Items
export const DEFAULT_NEWS_ITEMS: string[] = [
  "🎉 Welcome to Spinify! New players get 10 FREE spins!",
  "🔥 Hot Prize Alert: Chance to win up to ₹20 on the wheel!",
  "💸 Special Offer: Buy a spin bundle and get extra value!",
  "🏆 Leaderboard coming soon - compete for glory!",
  "💡 Tip: Check the AI Pro Tip feature for winning strategies!",
  "✨ Spin more, win more! Good luck, Spinify players!",
];

export interface AppSettings {
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
}

export const initialSettings: AppSettings = {
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
};

const SETTINGS_STORAGE_KEY = 'spinifyAdminSettings';
const NEWS_ITEMS_STORAGE_KEY = 'spinifyAdminNewsItems';

// --- AppSettings Management ---
export const getAppSettings = (): AppSettings => {
  if (typeof window === 'undefined') return initialSettings;
  const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
  try {
    return storedSettings ? { ...initialSettings, ...JSON.parse(storedSettings) } : initialSettings;
  } catch (error) {
    console.error("Error parsing app settings from localStorage", error);
    return initialSettings;
  }
};

export const saveAppSettings = (settings: Partial<AppSettings>) => {
  if (typeof window === 'undefined') return;
  const currentSettings = getAppSettings();
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...currentSettings, ...settings }));
  // Dispatch a custom event to notify other parts of the app
  window.dispatchEvent(new CustomEvent('app-settings-changed'));
};


// --- NewsItems Management ---
export const getNewsItems = (): string[] => {
  if (typeof window === 'undefined') return DEFAULT_NEWS_ITEMS;
  const storedNewsItems = localStorage.getItem(NEWS_ITEMS_STORAGE_KEY);
  try {
    return storedNewsItems ? JSON.parse(storedNewsItems) : DEFAULT_NEWS_ITEMS;
  } catch (error) {
    console.error("Error parsing news items from localStorage", error);
    return DEFAULT_NEWS_ITEMS;
  }
};

export const saveNewsItems = (items: string[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NEWS_ITEMS_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('news-items-changed'));
};
