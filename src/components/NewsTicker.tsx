
"use client";

import React, { useState, useEffect } from 'react';
import { Megaphone } from 'lucide-react';
import { getNewsItems, DEFAULT_NEWS_ITEMS } from '@/lib/appConfig';

const NewsTicker: React.FC = () => {
  const [currentNewsItems, setCurrentNewsItems] = useState<string[]>(DEFAULT_NEWS_ITEMS);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const loadNews = () => {
      setCurrentNewsItems(getNewsItems());
    };
    
    if (typeof window !== 'undefined') {
      loadNews(); // Load initial news
      window.addEventListener('news-items-changed', loadNews); // Listen for changes
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('news-items-changed', loadNews);
      }
    };
  }, []);

  // To ensure seamless looping, we duplicate the content.
  const displayItems = isClient && currentNewsItems.length > 0 ? [...currentNewsItems, ...currentNewsItems, ...currentNewsItems] : [...DEFAULT_NEWS_ITEMS, ...DEFAULT_NEWS_ITEMS, ...DEFAULT_NEWS_ITEMS];

  if (!isClient && currentNewsItems.length === 0) { // Avoid rendering empty ticker SSR or if no items
      return null;
  }
  
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
