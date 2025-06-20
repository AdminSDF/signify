import React from 'react';

const SiteFooter: React.FC = () => {
  return (
    <footer className="py-6 md:px-8 md:py-0 border-t border-border/40 bg-background">
      <div className="container flex flex-col items-center justify-center gap-2 py-4 md:h-24 md:flex-row md:py-0">
        <div className="text-center">
          <p className="text-balance text-sm leading-loose text-muted-foreground">
            © {new Date().getFullYear()} Spinify App. Powered by Firebase Studio & Genkit AI.
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
