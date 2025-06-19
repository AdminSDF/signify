import React from 'react';
import Link from 'next/link';
import { Home, ListChecks, UserCircle } from 'lucide-react'; // Added UserCircle for profile
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const SiteHeader: React.FC = () => {
  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-6 w-6 text-primary">
              <rect width="256" height="256" fill="none"></rect>
              <path d="M128,24a104,104,0,1,0,104,104A104.2,104.2,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z" opacity="0.2"></path>
              <path d="M128,24a104,104,0,1,0,104,104A104.2,104.2,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z" fill="currentColor" strokeWidth="0"></path>
              <path d="M143.8,149.9a40.2,40.2,0,0,1-31.6,0L70.7,173.2a88,88,0,0,0,45.2,18.7,87,87,0,0,0,12.1-.8V132a40,40,0,0,1,0-8Z" fill="currentColor" opacity="0.2" strokeWidth="0"></path>
              <path d="M143.8,149.9a40.2,40.2,0,0,1-31.6,0L70.7,173.2a88,88,0,0,0,45.2,18.7,87,87,0,0,0,12.1-.8V132a40,40,0,0,1,0-8Z" fill="hsl(var(--primary))" strokeWidth="0"></path>
            </svg>
            <span className="font-bold">Spinify App</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" passHref>
              <Button variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                <Home className="mr-2 h-4 w-4" /> Game
              </Button>
            </Link>
            <Link href="/transactions" passHref>
              <Button variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                <ListChecks className="mr-2 h-4 w-4" /> Transactions
              </Button>
            </Link>
            <Link href="/profile" passHref>
              <Button variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                <UserCircle className="mr-2 h-4 w-4" /> Profile
              </Button>
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
};

export default SiteHeader;
