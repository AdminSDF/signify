
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowUpRight, ShoppingCart } from 'lucide-react'; // Added ShoppingCart

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

const TRANSACTION_STORAGE_KEY = 'spinifyTransactions';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const storedTransactions = localStorage.getItem(TRANSACTION_STORAGE_KEY);
      if (storedTransactions) {
        try {
          const parsedTransactions = JSON.parse(storedTransactions) as Transaction[];
          // Sort by date descending before setting
          parsedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setTransactions(parsedTransactions);
        } catch (e) {
          console.error("Error parsing transactions from localStorage", e);
          setTransactions([]);
        }
      } else {
        setTransactions([]); // Set to empty if nothing in storage
      }
    }
  }, []);

  if (!isClient) {
    return (
       <div className="container mx-auto py-8">
        <Card className="w-full max-w-2xl mx-auto shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center font-headline text-primary">
              Transaction History
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Loading transaction history...
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center font-headline text-primary">
            Transaction History
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            View all your recent account activities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            {transactions.length === 0 ? (
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
                    amountColorClass = transaction.amount > 0 ? 'text-green-600' : 'text-foreground'; // Green for positive credit, default for 0
                  } else { // debit
                    icon = <ArrowDownLeft className="h-6 w-6 text-red-500" />;
                    amountColorClass = transaction.amount > 0 ? 'text-red-600' : 'text-foreground'; // Red for positive debit, default for 0
                  }
                  
                  // For "Try Again" or 0 amount prizes, don't show +/- sign if amount is 0.
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
                           <p className={`font-bold ${amountColorClass}`}>
                            {isPurchase ? '-' : amountPrefix}₹{transaction.amount.toFixed(2)}
                          </p>
                          <Badge 
                            variant={
                              transaction.status === 'completed' ? 'default' :
                              transaction.status === 'pending' ? 'secondary' : 'destructive'
                            }
                            className="mt-1 capitalize"
                          >
                            {transaction.status}
                          </Badge>
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
