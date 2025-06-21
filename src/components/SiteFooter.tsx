import React from 'react';

const SiteFooter: React.FC = () => {
  return (
    <footer className="py-6 md:px-8 md:py-0 border-t border-border/40 bg-background">
      <div className="container flex flex-col items-center justify-center gap-2 py-4 md:h-24 md:flex-row md:py-0">
        <div className="text-center space-y-1">
          <p className="text-balance text-sm leading-loose text-muted-foreground">
            Copyright © {new Date().getFullYear()} Spinify. All Rights Reserved.
          </p>
          <p className="text-balance text-sm leading-loose text-muted-foreground">
            Designed & Developed by <span className="font-semibold text-foreground">WASEEM AKRAM</span>
          </p>
          <p className="text-balance text-xs leading-loose text-muted-foreground">
            Disclaimer: This game is for entertainment purposes only and does not involve real money. All currency and transactions are virtual.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
