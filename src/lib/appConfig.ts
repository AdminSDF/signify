
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
  id: string; // Keep as string for flexibility, e.g., 'main'
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
  main: {
    id: 'main',
    name: 'Spinify Arena',
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
