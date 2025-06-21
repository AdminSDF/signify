
import type { Segment } from '@/components/SpinWheel';

export interface WheelTier {
  id: 'little' | 'big' | 'more-big';
  name: string;
  description: string;
  themeClass: string;
  baseCost: number;
  segments: (Segment & { probability: number })[];
}

export const wheelConfigs: { [key: string]: WheelTier } = {
  little: {
    id: 'little',
    name: 'Little Lux',
    description: 'Classic fun with frequent small wins! Starts from ₹2.',
    themeClass: 'theme-little',
    baseCost: 2, // This tier has dynamic pricing handled in the component
    segments: [
      { id: 's100', text: '₹100', emoji: '💎', amount: 100, color: '300 80% 60%', textColor: '0 0% 100%', probability: 0.005 },
      { id: 's50',  text: '₹50',  emoji: '💰', amount: 50,  color: '270 80% 65%', textColor: '0 0% 100%', probability: 0.015 },
      { id: 's20',  text: '₹20',  emoji: '💸', amount: 20,  color: '0 80% 60%',   textColor: '0 0% 100%', probability: 0.08 },
      { id: 's10',  text: '₹10',  emoji: '💵', amount: 10,  color: '30 90% 55%',  textColor: '0 0% 0%',   probability: 0.10 },
      { id: 's5',   text: '₹5',   emoji: '🎈', amount: 5,   color: '60 90% 55%',  textColor: '0 0% 0%',   probability: 0.20 },
      { id: 's2',   text: '₹2',   emoji: '🤑', amount: 2,   color: '120 70% 55%', textColor: '0 0% 100%', probability: 0.27 },
      { id: 's1',   text: '₹1',   emoji: '🪙', amount: 1,   color: '180 70% 50%', textColor: '0 0% 100%', probability: 0.32 },
      { id: 's0',   text: 'Try Again', emoji: '🔁', amount: 0, color: '210 80% 60%', textColor: '0 0% 100%', probability: 0.01 },
    ],
  },
  big: {
    id: 'big',
    name: 'Big Bonanza',
    description: 'Higher stakes, bigger prizes! Costs ₹10 per spin.',
    themeClass: 'theme-big',
    baseCost: 10,
    segments: [
      { id: 'b1000', text: '₹1000', emoji: '👑', amount: 1000, color: '45 100% 50%', textColor: '0 0% 0%', probability: 0.005 },
      { id: 'b500',  text: '₹500', emoji: '🏆', amount: 500,  color: '50 100% 60%', textColor: '0 0% 0%', probability: 0.015 },
      { id: 'b250',  text: '₹250', emoji: '🌟', amount: 250,  color: '35 100% 55%', textColor: '0 0% 0%', probability: 0.05 },
      { id: 'b100',  text: '₹100', emoji: '💎', amount: 100,  color: '20 80% 90%', textColor: '0 0% 0%', probability: 0.10 },
      { id: 'b50',   text: '₹50', emoji: '💰', amount: 50,   color: '190 20% 25%', textColor: '0 0% 100%', probability: 0.20 },
      { id: 'b25',   text: '₹25', emoji: '💸', amount: 25,   color: '210 30% 35%', textColor: '0 0% 100%', probability: 0.28 },
      { id: 'b10',   text: '₹10', emoji: '💵', amount: 10,   color: '220 15% 15%', textColor: '0 0% 100%', probability: 0.34 },
      { id: 'b0',    text: 'Lose', emoji: '💀', amount: 0,  color: '0 0% 10%', textColor: '0 0% 100%', probability: 0.01 },
    ],
  },
  'more-big': {
    id: 'more-big',
    name: 'Mega Millions',
    description: 'The ultimate risk for the ultimate reward! Costs ₹20 per spin.',
    themeClass: 'theme-more-big',
    baseCost: 20,
    segments: [
        { id: 'm5000', text: '₹5000', emoji: '🚀', amount: 5000, color: '210 100% 50%', textColor: '0 0% 100%', probability: 0.005 },
        { id: 'm2000', text: '₹2000', emoji: '🌌', amount: 2000, color: '190 100% 45%', textColor: '0 0% 100%', probability: 0.015 },
        { id: 'm1000', text: '₹1000', emoji: '👑', amount: 1000, color: '180 90% 40%', textColor: '0 0% 100%', probability: 0.05 },
        { id: 'm500',  text: '₹500', emoji: '🏆', amount: 500,  color: '170 80% 35%', textColor: '0 0% 100%', probability: 0.10 },
        { id: 'm100',  text: '₹100', emoji: '💎', amount: 100,  color: '0 0% 95%', textColor: '0 0% 0%', probability: 0.20 },
        { id: 'm50',   text: '₹50', emoji: '💰', amount: 50,   color: '0 0% 85%', textColor: '0 0% 0%', probability: 0.28 },
        { id: 'm20',   text: '₹20', emoji: '💵', amount: 20,   color: '0 0% 75%', textColor: '0 0% 0%', probability: 0.34 },
        { id: 'm0',    text: 'Lose', emoji: '💀', amount: 0,  color: '0 0% 10%', textColor: '0 0% 100%', probability: 0.01 },
    ]
  }
};
