
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Home, ListChecks, UserCircle, Trophy, LogIn, LogOut, Shield, HelpCircle, Swords, Bell, UserPlus } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getNotifications, markNotificationAsRead, Notification } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

const NotificationBell: React.FC = () => {
    const { user } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) return;
        
        const unsubscribe = getNotifications(user.uid, (newNotifications) => {
            setNotifications(newNotifications);
            const unread = newNotifications.filter(n => !n.isRead).length;
            setUnreadCount(unread);
        });

        return () => unsubscribe();
    }, [user]);
    
    const handleNotificationClick = async (notification: Notification) => {
      if (!user) return;
      if (!notification.isRead) {
        await markNotificationAsRead(user.uid, notification.id);
      }
      if(notification.actionLink) {
        router.push(notification.actionLink);
      }
    };

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 rounded-full bg-destructive text-destructive-foreground animate-pulse">
                    {unreadCount}
                </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Notifications</h4>
              <p className="text-sm text-muted-foreground">
                You have {unreadCount} unread messages.
              </p>
            </div>
            <div className="grid gap-2">
              {notifications.length > 0 ? notifications.map(notif => (
                 <div key={notif.id} onClick={() => handleNotificationClick(notif)} className="p-2 -m-2 rounded-md hover:bg-accent cursor-pointer">
                    <div className="flex items-start gap-3">
                        <div className={`mt-1 h-2.5 w-2.5 rounded-full ${notif.isRead ? 'bg-transparent' : 'bg-primary'}`} />
                        <div className="grid gap-1">
                            <p className="text-sm font-medium">{notif.title}</p>
                            <p className="text-sm text-muted-foreground">{notif.body}</p>
                        </div>
                    </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">No new notifications.</p>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
}


const SiteHeader: React.FC = () => {
  const { user, userData, logout, loading, appSettings } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Image src={appSettings.logoUrl} alt="Spinify Logo" width={32} height={32} className="h-8 w-8 rounded-full" />
          </Link>
          <nav className="flex items-center gap-1 text-sm flex-grow">
            <Link href="/" passHref>
              <Button variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                <Home className="mr-1 h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Game</span>
              </Button>
            </Link>
             <Link href="/tournaments" passHref>
              <Button variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                <Swords className="mr-1 h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Tournaments</span>
              </Button>
            </Link>
            <Link href="/leaderboard" passHref>
              <Button variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                <Trophy className="mr-1 h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Leaderboard</span>
              </Button>
            </Link>
            <Link href="/transactions" passHref>
              <Button variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                <ListChecks className="mr-1 h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Transactions</span>
              </Button>
            </Link>
             <Link href="/help" passHref>
              <Button variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                <HelpCircle className="mr-1 h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Help</span>
              </Button>
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {loading ? (
              <div className="animate-pulse flex items-center gap-2">
                 <div className="h-8 w-8 rounded-full bg-muted"></div>
              </div>
            ) : user ? (
              <>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button data-tour-id="header-profile-button" variant="ghost" className="relative h-9 w-9 rounded-full p-0">
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
              </>
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
