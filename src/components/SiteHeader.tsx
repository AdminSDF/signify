
"use client";

import React from 'react';
import Link from 'next/link';
import { Home, ListChecks, UserCircle, Trophy, LogIn, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SiteHeader: React.FC = () => {
  const { user, userData, logout, loading } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-6 w-6 text-primary">
              <rect width="256" height="256" fill="none"></rect>
              <path d="M128,24a104,104,0,1,0,104,104A104.2,104.2,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z" opacity="0.2"></path>
              <path d="M128,24a104,104,0,1,0,104,104A104.2,104.2,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z" fill="currentColor" strokeWidth="0"></path>
              <path d="M143.8,149.9a40.2,40.2,0,0,1-31.6,0L70.7,173.2a88,88,0,0,0,45.2,18.7,87,87,0,0,0,12.1-.8V132a40,40,0,0,1,0-8Z" fill="hsl(var(--primary))" strokeWidth="0"></path>
            </svg>
          </Link>
          <nav className="flex items-center gap-1 text-sm flex-grow">
            <Link href="/" passHref>
              <Button variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                <Home className="mr-1 h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Game</span>
              </Button>
            </Link>
            <Link href="/transactions" passHref>
              <Button variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                <ListChecks className="mr-1 h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Transactions</span>
              </Button>
            </Link>
            <Link href="/leaderboard" passHref>
              <Button variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                <Trophy className="mr-1 h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Leaderboard</span>
              </Button>
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {loading ? (
              <div className="animate-pulse flex items-center gap-2">
                 <div className="h-8 w-8 rounded-full bg-muted"></div>
                 <div className="h-4 w-20 rounded bg-muted"></div>
              </div>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                    <Avatar className="h-9 w-9 border-2 border-primary/50">
                      <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || 'User'} />
                      <AvatarFallback>{user.displayName?.[0] || user.email?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName || "User"}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                     <Link href="/profile" className="cursor-pointer">
                        <UserCircle className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                  </DropdownMenuItem>
                  {userData?.isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login" passHref>
                <Button variant="default" size="sm">
                  <LogIn className="mr-2 h-4 w-4" /> Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default SiteHeader;
