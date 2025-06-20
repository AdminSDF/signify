
"use client";

import React, { useState, useEffect } from 'react';
import { Megaphone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext'; // Use AuthContext to get news items and speed

const NewsTicker: React.FC = () => {
  const { newsItems: contextNewsItems, appSettings, isAppConfigLoading } = useAuth();
  
  const [displayNewsItems, setDisplayNewsItems] = useState<string[]>([]);
  const [currentTickerSpeed, setCurrentTickerSpeed] = useState<number>(60); // Default
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !isAppConfigLoading) {
      setDisplayNewsItems(contextNewsItems.length > 0 ? contextNewsItems : ["Welcome to Spinify!"]); // Fallback if context is empty
      setCurrentTickerSpeed(appSettings.newsTickerSpeed || 60);
    }
  }, [isClient, contextNewsItems, appSettings, isAppConfigLoading]);


  // To ensure seamless looping, we duplicate the content.
  const itemsForMarquee = isClient && displayNewsItems.length > 0 
    ? [...displayNewsItems, ...displayNewsItems, ...displayNewsItems] 
    : ["Loading news...", "Loading news...", "Loading news..."];

  if (!isClient || isAppConfigLoading || displayNewsItems.length === 0) { 
      return null; // Don't render if not client, config is loading, or no items
  }
  
  const marqueeStyle: React.CSSProperties = {
    '--marquee-duration': `${currentTickerSpeed}s`,
  } as React.CSSProperties;

  return (
    <div className="bg-secondary text-secondary-foreground py-2 shadow-md overflow-hidden w-full">
      <div 
        className="marquee-content-wrapper flex items-center"
        style={marqueeStyle}
      >
        <Megaphone className="w-5 h-5 mx-3 shrink-0" />
        {itemsForMarquee.map((item, index) => (
          <span key={index} className="px-4 whitespace-nowrap">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

export default NewsTicker;
