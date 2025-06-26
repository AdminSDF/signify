
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserRewardData, RewardConfig } from '@/lib/firebase';
import { Gift, Sparkles } from 'lucide-react';

interface DailyRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim: () => void;
  isClaiming: boolean;
  rewardData: UserRewardData;
  rewardConfig: RewardConfig;
}

const DailyRewardModal: React.FC<DailyRewardModalProps> = ({
  isOpen,
  onClose,
  onClaim,
  isClaiming,
  rewardData,
  rewardConfig,
}) => {
  const { currentStreak } = rewardData;
  const streakForToday = currentStreak + 1;

  // Find if there's a specific streak bonus for today
  let reward = rewardConfig.streakBonuses.find(b => b.afterDays === streakForToday);
  let isStreakBonus = true;

  // If not, find the daily reward
  if (!reward) {
    const dayIndex = currentStreak % rewardConfig.dailyRewards.length;
    reward = rewardConfig.dailyRewards[dayIndex];
    isStreakBonus = false;
  }
  
  if (!reward) {
    // Fallback in case of config error
    return null;
  }

  const rewardText = reward.type === 'credit' 
    ? `₹${reward.value}`
    : `${reward.value} ${reward.type === 'spin' ? 'Free Spin(s)' : 'VIP Day(s)'}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground">
        <DialogHeader className="text-center">
          <div className="text-6xl mx-auto mb-4 animate-bounce-once">{isStreakBonus ? '🏆' : '🎁'}</div>
          <DialogTitle className="text-2xl font-bold font-headline text-primary">
            {isStreakBonus ? 'Streak Bonus!' : `Day ${streakForToday} Reward!`}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-2">
            Your daily login reward is ready. Keep the streak going for bigger prizes!
          </DialogDescription>
        </DialogHeader>
        
        <div className="my-6 p-6 rounded-lg bg-primary/10 border-2 border-dashed border-primary text-center">
          <p className="text-lg text-foreground">You've unlocked:</p>
          <p className="text-4xl font-bold text-primary my-2">{rewardText}</p>
        </div>

        <DialogFooter>
          <Button 
            onClick={onClaim} 
            disabled={isClaiming}
            className="w-full text-lg py-6"
          >
            {isClaiming ? (
              <><div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary-foreground mr-2"></div> Claiming...</>
            ) : (
              <><Sparkles className="mr-2 h-5 w-5"/> Claim Now</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DailyRewardModal;
