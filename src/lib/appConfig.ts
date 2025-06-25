
// Default Game Settings - These serve as fallbacks or initial structure

// Interface for a single slice on the wheel
export interface SegmentConfig {
  id: string;
  text: string;
  emoji: string;
  amount: number; // Replaced 'multiplier' with 'amount'
  probability: number; // Chance of this segment being picked
  color: string;
  textColor?: string;
}

// Interface for a full wheel configuration
export interface WheelTierConfig {
  id: 'little' | 'big' | 'more-big' | 'stall-machine';
  name: string;
  description: string;
  themeClass: string;
  isLocked: boolean; // Controls if the arena is playable/withdrawable
  minWithdrawalAmount: number; // Moved from global settings
  costSettings: {
    type: 'tiered' | 'fixed';
    baseCost?: number; // for fixed cost wheels
    tier1Limit?: number; // for tiered cost wheels
    tier1Cost?: number;
    tier2Limit?: number;
    tier2Cost?: number;
    tier3Cost?: number;
  };
  segments: SegmentConfig[];
}

// Initial, fallback configuration for all wheels.
// This is used ONLY if data is not found in Firestore.
export const initialWheelConfigs: { [key: string]: WheelTierConfig } = {
  little: {
    id: 'little',
    name: 'Little Lux',
    description: 'Classic fun with frequent small wins!',
    themeClass: 'theme-little',
    isLocked: false,
    minWithdrawalAmount: 500,
    costSettings: {
      type: 'tiered',
      tier1Limit: 30,
      tier1Cost: 2,
      tier2Limit: 60,
      tier2Cost: 3,
      tier3Cost: 5,
    },
    segments: [
      { id: 's-big', text: 'Big Win', emoji: '🎉', amount: 20, probability: 5, color: '300 80% 60%', textColor: '0 0% 100%' },
      { id: 's-med',  text: 'Medium Win',  emoji: '💰', amount: 5, probability: 10,  color: '270 80% 65%', textColor: '0 0% 100%' },
      { id: 's-small',  text: 'Small Win',  emoji: '💸', amount: 1, probability: 25,  color: '0 80% 60%',   textColor: '0 0% 100%' },
      { id: 's-lose1',   text: 'Try Again', emoji: '🔁', amount: 0, probability: 60,   color: '60 90% 55%',  textColor: '0 0% 0%' },
    ],
  },
  big: {
    id: 'big',
    name: 'Big Bonanza',
    description: 'Higher stakes, bigger prizes!',
    themeClass: 'theme-big',
    isLocked: false,
    minWithdrawalAmount: 1000,
    costSettings: {
      type: 'fixed',
      baseCost: 10,
    },
    segments: [
      { id: 'b-big', text: 'Big Win', emoji: '👑', amount: 50, probability: 5, color: '45 100% 50%', textColor: '0 0% 0%' },
      { id: 'b-med',  text: 'Medium Win', emoji: '🏆', amount: 20, probability: 10,  color: '50 100% 60%', textColor: '0 0% 0%' },
      { id: 'b-small',  text: 'Small Win', emoji: '🌟', amount: 5, probability: 25,  color: '35 100% 55%', textColor: '0 0% 0%' },
      { id: 'b-lose1',   text: 'Try Again', emoji: '💀', amount: 0, probability: 60,   color: '190 20% 25%', textColor: '0 0% 100%' },
    ],
  },
  'more-big': {
    id: 'more-big',
    name: 'Mega Millions',
    description: 'The ultimate risk for the ultimate reward!',
    themeClass: 'theme-more-big',
    isLocked: false,
    costSettings: {
        type: 'fixed',
        baseCost: 20,
    },
    minWithdrawalAmount: 2000,
    segments: [
        { id: 'm-big', text: 'Big Win', emoji: '🚀', amount: 100, probability: 5, color: '210 100% 50%', textColor: '0 0% 100%' },
        { id: 'm-med', text: 'Medium Win', emoji: '🌌', amount: 40, probability: 10, color: '190 100% 45%', textColor: '0 0% 100%' },
        { id: 'm-small', text: 'Small Win', emoji: '👑', amount: 10, probability: 25, color: '180 90% 40%', textColor: '0 0% 100%' },
        { id: 'm-lose1',  text: 'Try Again', emoji: '💀', amount: 0, probability: 60,  color: '170 80% 35%', textColor: '0 0% 100%' },
    ]
  },
  'stall-machine': {
    id: 'stall-machine',
    name: 'Stall Machine',
    description: 'Classic slot machine fun. Match the symbols to win!',
    themeClass: 'theme-stall-machine',
    isLocked: false,
    minWithdrawalAmount: 1500,
    costSettings: {
      type: 'fixed',
      baseCost: 15,
    },
    segments: [
      { id: 'sm-777', text: 'JACKPOT', emoji: '🎰', amount: 1500, probability: 2, color: '0 80% 60%', textColor: '0 0% 100%' },
      { id: 'sm-bar', text: 'BAR', emoji: '🍫', amount: 500, probability: 8, color: '40 90% 55%', textColor: '40 90% 10%' },
      { id: 'sm-bell', text: 'BELL', emoji: '🔔', amount: 100, probability: 15, color: '50 100% 65%', textColor: '50 100% 10%' },
      { id: 'sm-cherry', text: 'CHERRY', emoji: '🍒', amount: 50, probability: 25, color: '0 70% 45%', textColor: '0 0% 100%' },
      { id: 'sm-lose', text: 'Try Again', emoji: '💀', amount: 0, probability: 50, color: '240 10% 25%', textColor: '0 0% 90%' },
    ],
  },
};

export const DEFAULT_LOGO_URL = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh-PsVQj50OZx4UwZAuk7W0JDqdVv7XtdPtA6RdvBPdJhIDzCnNnM8sfdKkZD8MTbpZIk3-E4aJA9oehwoZnTEmDhH1c7B89EJINSQngImBFvAUFPTcFAGAj0vXi9UNeBOMDOSJtw4a0GUGMNakf-z7TTS9S-vziyAbW8LpcrcIA9R7SNSj0G3ECbtMlJuT/s1600/file_00000000f80061f882df150eb41a6b72.png";

export interface WinRateRule {
  id: string; // e.g., 'rule-new-user'
  tag: string; // e.g., 'new', 'high-loss'
  rate: number; // 0 to 1
  priority: number; // lower is higher priority
}

// General App Settings Interface
export interface AppSettings {
  appName: string;
  logoUrl: string;
  upiId: string;
  initialBalanceForNewUsers: number;
  maxSpinsInBundle: number; // Free spins for new users
  minAddBalanceAmount: number;
  addBalancePresets: number[];
  newsTickerSpeed: number;
  referralBonusForNewUser: number; // Bonus for the person who signs up
  referralBonusForReferrer: number; // Bonus for the referrer on referee's first deposit
  wheelConfigs: { [key: string]: WheelTierConfig };
  // Dynamic Winning Chance Settings
  defaultWinRate: number; // Default chance to win (0 to 1)
  winRateRules: WinRateRule[];
}

// Initial structure / fallback for general settings if Firestore is unavailable.
export const initialSettings: AppSettings = {
  appName: "Spinify",
  logoUrl: DEFAULT_LOGO_URL,
  upiId: "9828786246@jio",
  initialBalanceForNewUsers: 50.00,
  maxSpinsInBundle: 10,
  minAddBalanceAmount: 100,
  addBalancePresets: [100, 200, 500, 1000],
  newsTickerSpeed: 60,
  referralBonusForNewUser: 10,
  referralBonusForReferrer: 25,
  wheelConfigs: initialWheelConfigs, // Nesting the wheel configs here
  defaultWinRate: 0.4, // 40% default win rate
  winRateRules: [
    { id: 'rule-new', tag: 'new', rate: 0.6, priority: 1 }, // 60% win rate for new users
    { id: 'rule-high-loss', tag: 'high-loss', rate: 0.5, priority: 2 }, // 50% for high-loss users
  ]
};

// --- Other constants ---
export const DEFAULT_NEWS_ITEMS: string[] = [
  "🎉 Welcome to Spinify! Loading latest news...",
  "🔥 Hot Prize Alert! Check the wheel for big wins!",
  "✨ Spin more, win more! Good luck!",
];

export const ADMIN_EMAIL_CONFIG_KEY = 'adminUserEmail';
// Can be a single email or a comma-separated list
export const DEFAULT_ADMIN_EMAIL = "jameafaizanrasool@gmail.com,waseem982878@gmail.com";
