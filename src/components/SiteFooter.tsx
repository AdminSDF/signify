"use client";

import React from 'react';
import DisclaimerMarquee from './DisclaimerMarquee';
import dynamic from 'next/dynamic';
import { Button } from './ui/button';

// Dynamically import the FooterAd component with SSR turned off.
// This prevents it from being rendered on the server, thus avoiding hydration errors.
const FooterAd = dynamic(() => import('./FooterAd'), { 
  ssr: false,
  // Render a placeholder with a fixed height to prevent layout shift while the ad loads.
  loading: () => <div className="my-4" style={{ height: '90px' }} />
});

// A custom component for the Telegram Icon, as it's not in lucide-react
const TelegramIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
    >
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-1.37.2-1.64l16.4-6.2c.75-.29 1.4.35 1.15 1.3l-3.22 14.22c-.24.97-1.04 1.2-1.8.75l-5.36-3.92-2.55 2.47c-.28.28-.73.12-1.02-.27z" />
    </svg>
);

const SiteFooter: React.FC = () => {
  return (
    <footer className="border-t border-border/40 bg-background">
      <FooterAd />
      <div className="container flex flex-col items-center justify-between gap-4 py-4 md:h-24 md:flex-row md:py-0">
        <div className="text-center md:text-left">
          <p className="text-balance text-sm leading-loose text-muted-foreground">
            Copyright © {new Date().getFullYear()} Spinify | Designed & Developed by <span className="font-semibold text-foreground">WASEEM AKRAM</span>
          </p>
        </div>
        <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon">
                <a href="https://t.me/boost?c=2511117585" target="_blank" rel="noopener noreferrer" aria-label="Join us on Telegram">
                    <TelegramIcon />
                </a>
            </Button>
        </div>
      </div>
      <DisclaimerMarquee />
    </footer>
  );
};

export default SiteFooter;
