"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

const mockTransactions: Transaction[] = [
  { id: '1', type: 'credit', amount: 50, description: 'Won from Spin Wheel', date: '2024-07-28', status: 'completed' },
  { id: '2', type: 'credit', amount: 10, description: 'Daily Login Bonus', date: '2024-07-28', status: 'completed' },
  { id: '3', type: 'debit', amount: 20, description: 'Entered Tournament', date: '2024-07-27', status: 'completed' },
  { id: '4', type: 'credit', amount: 100, description: 'Jackpot Prize!', date: '2024-07-26', status: 'completed' },
  { id: '5', type: 'debit', amount: 5, description: 'Extra Spin Purchase', date: '2024-07-26', status: 'pending' },
  { id: '6', type: 'credit', amount: 5, description: 'Won from Spin Wheel', date: '2024-07-25', status: 'completed' },
  { id: '7', type: 'debit', amount: 10, description: 'Avatar Item Purchase', date: '2024-07-25', status: 'failed' },
];

export default function TransactionsPage() {
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
            {mockTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground">No transactions yet.</p>
            ) : (
              <ul className="space-y-4">
                {mockTransactions.map((transaction) => (
                  <li key={transaction.id} className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {transaction.type === 'credit' ? (
                          <ArrowUpRight className="h-6 w-6 text-green-500" />
                        ) : (
                          <ArrowDownLeft className="h-6 w-6 text-red-500" />
                        )}
                        <div>
                          <p className="font-semibold text-foreground">{transaction.description}</p>
                          <p className="text-sm text-muted-foreground">{new Date(transaction.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
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
                ))}
              </ul>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
