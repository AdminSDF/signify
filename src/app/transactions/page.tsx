
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowUpRight, ShoppingCart, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getTransactionsFromFirestore, type TransactionData as FirestoreTransactionData, Timestamp } from '@/lib/firebase';
import { Button } from '@/components/ui/button';

interface TransactionDisplayItem extends Omit<FirestoreTransactionData, 'date'> {
  id: string; // Firestore document ID
  date: string; // Formatted date string for display
}

export default function TransactionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<TransactionDisplayItem[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchTransactions = useCallback(async () => {
    if (!user || !user.uid || !isClient) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const firestoreTransactions = await getTransactionsFromFirestore(user.uid, 50);
      const displayableTransactions = firestoreTransactions.map(t => ({
        ...t, // Spreads all properties from t (TransactionData & {id: string})
        date: t.date instanceof Timestamp ? t.date.toDate().toISOString() : new Date(t.date as any).toISOString(), // Overwrites date with string version
      }));
      setTransactions(displayableTransactions);
    } catch (error) {
      console.error("TRANSACTIONS_PAGE_ERROR: Error fetching transactions from Firestore:", error);
      if (error instanceof Error && (error.message.includes("query requires an index") || error.message.includes("Query requires a composite index"))) {
        console.warn(
          "TRANSACTIONS_PAGE_WARN: Firestore query requires an index. " +
          "This usually happens when filtering by one field (e.g., 'userId') and ordering by another (e.g., 'date'). " +
          "Please check the Firebase console (Firestore > Indexes) for a link/button to create the missing composite index. " +
          "The error message in the console might contain a direct link to create it."
        );
      }
      setTransactions([]); // Clear transactions on error
    } finally {
      setIsLoading(false);
    }
  }, [user, isClient]);

  useEffect(() => {
    if (isClient) {
      if (user && user.uid && !authLoading) {
        fetchTransactions();
      } else if (!user && !authLoading) {
        // User is definitely logged out and auth state is resolved
        setTransactions([]);
        setIsLoading(false);
      }
      // If user is null but authLoading is true, we wait.
      // If user is present but authLoading is true, we wait.
    }
  }, [isClient, user, authLoading, fetchTransactions]);

  if (!isClient || authLoading && isLoading) { // Show loader if client isn't ready or if auth is loading AND we are in initial loading state for transactions
    return (
       <div className="container mx-auto py-8">
        <Card className="w-full max-w-2xl mx-auto shadow-xl">
          <CardHeader><CardTitle className="text-3xl font-bold text-center font-headline text-primary">Transaction History</CardTitle><CardDescription className="text-center text-muted-foreground">Loading...</CardDescription></CardHeader>
          <CardContent className="h-[400px] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></CardContent>
        </Card>
      </div>
    );
  }
  
  if (!user && isClient && !authLoading) { // User is confirmed to be logged out
     return (
       <div className="container mx-auto py-8">
        <Card className="w-full max-w-2xl mx-auto shadow-xl">
          <CardHeader><CardTitle className="text-3xl font-bold text-center font-headline text-primary">Transaction History</CardTitle></CardHeader>
          <CardContent className="h-[400px] flex flex-col items-center justify-center text-center">
            <p className="text-muted-foreground mb-4">Please log in to view your transaction history.</p>
            <Button onClick={() => window.location.href = '/login'}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-3xl font-bold font-headline text-primary">Transaction History</CardTitle>
            <CardDescription className="text-muted-foreground">View all your recent account activities.</CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={fetchTransactions} disabled={isLoading} aria-label="Refresh transactions">
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? ( // This isLoading is for the fetchTransactions operation itself
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No transactions yet. Play the game to see your history!</p>
            ) : (
              <ul className="space-y-4">
                {transactions.map((transaction) => {
                  const isPurchase = transaction.description.toLowerCase().includes('purchased');
                  let icon;
                  let amountColorClass;

                  if (isPurchase) {
                    icon = <ShoppingCart className="h-6 w-6 text-blue-500" />;
                    amountColorClass = 'text-blue-600';
                  } else if (transaction.type === 'credit') {
                    icon = <ArrowUpRight className="h-6 w-6 text-green-500" />;
                    amountColorClass = transaction.amount > 0 ? 'text-green-600' : 'text-foreground';
                  } else { 
                    icon = <ArrowDownLeft className="h-6 w-6 text-red-500" />;
                    amountColorClass = transaction.amount > 0 ? 'text-red-600' : 'text-foreground';
                  }
                  const amountPrefix = transaction.amount === 0 ? '' : (transaction.type === 'credit' && !isPurchase ? '+' : '-');

                  return (
                    <li key={transaction.id} className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-card">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {icon}
                          <div>
                            <p className="font-semibold text-foreground">{transaction.description}</p>
                            <p className="text-sm text-muted-foreground">{new Date(transaction.date).toLocaleDateString()} {new Date(transaction.date).toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                           <p className={`font-bold ${amountColorClass}`}>{isPurchase ? '-' : amountPrefix}₹{transaction.amount.toFixed(2)}</p>
                          <Badge variant={transaction.status === 'completed' ? 'default' : transaction.status === 'pending' ? 'secondary' : 'destructive'} className="mt-1 capitalize">{transaction.status}</Badge>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

