
"use client";

import React, { useState, useEffect } from 'react';
import { Megaphone } from 'lucide-react';
import { getNewsItems, DEFAULT_NEWS_ITEMS, getAppSettings } from '@/lib/appConfig';

const NewsTicker: React.FC = () => {
  const [currentNewsItems, setCurrentNewsItems] = useState<string[]>(DEFAULT_NEWS_ITEMS);
  const [tickerSpeed, setTickerSpeed] = useState<number>(getAppSettings().newsTickerSpeed);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const loadConfig = () => {
      setCurrentNewsItems(getNewsItems());
      setTickerSpeed(getAppSettings().newsTickerSpeed);
    };
    
    if (typeof window !== 'undefined') {
      loadConfig(); // Load initial news and speed
      window.addEventListener('news-items-changed', loadConfig); 
      window.addEventListener('app-settings-changed', loadConfig); // Listen for speed changes too
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('news-items-changed', loadConfig);
        window.removeEventListener('app-settings-changed', loadConfig);
      }
    };
  }, []);

  // To ensure seamless looping, we duplicate the content.
  // Using at least 3 repetitions for smoother looping with variable content length
  const displayItems = isClient && currentNewsItems.length > 0 ? [...currentNewsItems, ...currentNewsItems, ...currentNewsItems] : [...DEFAULT_NEWS_ITEMS, ...DEFAULT_NEWS_ITEMS, ...DEFAULT_NEWS_ITEMS];

  if (!isClient || currentNewsItems.length === 0) { 
      return null;
  }
  
  const marqueeStyle: React.CSSProperties = {
    '--marquee-duration': `${tickerSpeed}s`,
  } as React.CSSProperties;

  return (
    <div className="bg-secondary text-secondary-foreground py-2 shadow-md overflow-hidden w-full">
      <div 
        className="marquee-content-wrapper flex items-center"
        style={marqueeStyle}
      >
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

