"use client";

import React from 'react';
import DisclaimerMarquee from './DisclaimerMarquee';
import dynamic from 'next/dynamic';

// Dynamically import the FooterAd component with SSR turned off.
// This prevents it from being rendered on the server, thus avoiding hydration errors.
const FooterAd = dynamic(() => import('./FooterAd'), { 
  ssr: false,
  // Render a placeholder with a fixed height to prevent layout shift while the ad loads.
  loading: () => <div className="my-4" style={{ height: '90px' }} />
});


const SiteFooter: React.FC = () => {
  return (
    <footer className="border-t border-border/40 bg-background">
      <FooterAd />
      <div className="container flex flex-col items-center justify-center gap-2 py-4 md:h-24 md:flex-row md:py-0">
        <div className="text-center space-y-1">
          <p className="text-balance text-sm leading-loose text-muted-foreground">
            Copyright © {new Date().getFullYear()} Spinify | Designed & Developed by <span className="font-semibold text-foreground">WASEEM AKRAM</span>
          </p>
        </div>
      </div>
      <DisclaimerMarquee />
    </footer>
  );
};

export default SiteFooter;
