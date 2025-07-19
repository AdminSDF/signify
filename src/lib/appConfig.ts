
// Default Game Settings - These serve as fallbacks or initial structure

// Interface for a single slice on the wheel
export interface SegmentConfig {
  id: string;
  text: string;
  emoji: string;
  amount: number; // This now represents the BASE amount for the lowest bet
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
  // NEW: Defines selectable bet amounts and the base bet for prize calculation
  betOptions: {
    options: number[]; // e.g., [5, 10, 20, 50]
    baseBet: number;   // The bet amount for which the segment `amount` is defined, e.g., 5
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
    betOptions: {
      options: [2, 5, 10, 20],
      baseBet: 2, // The segment amounts below are for a ₹2 bet
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
    betOptions: {
      options: [10, 25, 50, 100],
      baseBet: 10, // The segment amounts below are for a ₹10 bet
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
    betOptions: {
        options: [20, 50, 100, 250],
        baseBet: 20, // The segment amounts below are for a ₹20 bet
    },
    isLocked: false,
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
    betOptions: {
      options: [15, 30, 75, 150],
      baseBet: 15, // The segment amounts below are for a ₹15 bet
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

// --- Daily Rewards ---
export interface DailyReward {
  day: number;
  type: "spin" | "credit" | "vip";
  value: number;
  emoji: string;
}

export interface StreakBonus {
  afterDays: number;
  type: "spin" | "credit" | "vip";
  value: number;
  emoji: string;
}

export interface RewardConfig {
  dailyRewards: DailyReward[];
  streakBonuses: StreakBonus[];
  resetIfMissed: boolean;
}

// --- Referral System ---
export interface TieredBonus {
  count: number; // e.g., 1, 5, 10
  rewardSpins: number;
  rewardCash: number; // in rupees
  description: string;
}

export interface ReferralMilestone {
  count: number; // e.g., 5, 25, 100
  rewardSpins: number;
  badge: string; // e.g., "Bronze Referrer"
  description: string;
}

// --- Custom Ads ---
export interface CustomAd {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    linkUrl: string;
    isActive: boolean;
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
  rewardConfig: RewardConfig; // Nesting reward config for simplicity
  // New Referral System Config
  tieredBonuses: TieredBonus[];
  referralMilestones: ReferralMilestone[];
  // Custom Ads
  customAds: CustomAd[];
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
  ],
  rewardConfig: {
    dailyRewards: [
      { day: 1, type: "spin", value: 1, emoji: "🎁" },
      { day: 2, type: "credit", value: 5, emoji: "💰" },
      { day: 3, type: "spin", value: 2, emoji: "🎁" },
      { day: 4, type: "credit", value: 10, emoji: "💰" },
      { day: 5, type: "spin", value: 3, emoji: "🎁" },
      { day: 6, type: "credit", value: 15, emoji: "💰" },
      { day: 7, type: "spin", value: 5, emoji: "🎉" },
    ],
    streakBonuses: [
      { afterDays: 7, type: "credit", value: 50, emoji: "🏆" },
      { afterDays: 30, type: "credit", value: 250, emoji: "👑" },
    ],
    resetIfMissed: true,
  },
  tieredBonuses: [
    { count: 1, rewardSpins: 100, rewardCash: 0, description: "for your 1st successful referral" },
    { count: 5, rewardSpins: 500, rewardCash: 50, description: "for your 5th successful referral" },
    { count: 10, rewardSpins: 1000, rewardCash: 100, description: "for your 10th successful referral" },
  ],
  referralMilestones: [
    { count: 5, rewardSpins: 50, badge: 'Bronze', description: "Bronze Referrer" },
    { count: 25, rewardSpins: 200, badge: 'Silver', description: "Silver Referrer" },
    { count: 100, rewardSpins: 1000, badge: 'Gold', description: "Gold Referrer" },
    { count: 500, rewardSpins: 5000, badge: 'Platinum', description: "Platinum Referrer" },
  ],
  customAds: [],
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
