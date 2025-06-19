
"use client";

import React from 'react';
import { Megaphone } from 'lucide-react';

const newsItems = [
  "🎉 Welcome to Spinify! New players get 10 FREE spins!",
  "🔥 Hot Prize Alert: Chance to win up to ₹20 on the wheel!",
  "💸 Special Offer: Buy a spin bundle and get extra value!",
  "🏆 Leaderboard coming soon - compete for glory!",
  "💡 Tip: Check the AI Pro Tip feature for winning strategies!",
  "✨ Spin more, win more! Good luck, Spinify players!",
];

// To ensure seamless looping, we duplicate the content.
// The number of duplications might need adjustment based on content length and screen width.
const displayItems = [...newsItems, ...newsItems, ...newsItems];

const NewsTicker: React.FC = () => {
  return (
    <div className="bg-secondary text-secondary-foreground py-2 shadow-md overflow-hidden w-full">
      <div className="marquee-content-wrapper flex items-center">
        <Megaphone className="w-5 h-5 mx-3 shrink-0" />
        {displayItems.map((item, index) => (
          <span key={index} className="px-4 whitespace-nowrap">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

export default NewsTicker;
