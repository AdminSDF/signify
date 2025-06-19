import React from 'react';

const SiteFooter: React.FC = () => {
  return (
    <footer className="py-6 md:px-8 md:py-0 border-t border-border/40 bg-background">
      <div className="container flex flex-col items-center justify-center gap-4 md:h-20 md:flex-row">
        <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
          © {new Date().getFullYear()} Spinify App. Powered by Firebase Studio & Genkit AI.
        </p>
      </div>
    </footer>
  );
};

export default SiteFooter;
