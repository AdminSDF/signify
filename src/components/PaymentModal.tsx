
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, CreditCard } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils'; // We'll create this utility

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  upiId: string;
  amount: number;
  spinsToGet: number;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  upiId,
  amount,
  spinsToGet,
}) => {
  const { toast } = useToast();

  const handleCopyUpiId = async () => {
    try {
      await copyToClipboard(upiId);
      toast({
        title: "UPI ID Copied!",
        description: "The UPI ID has been copied to your clipboard.",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Could not copy UPI ID. Please copy it manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-headline">
            <CreditCard className="w-7 h-7 text-primary" />
            Purchase More Spins
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="mt-2 text-base text-center">
          Get <span className="font-bold text-primary">{spinsToGet} spins</span> for just <span className="font-bold text-primary">₹{amount}</span>!
        </DialogDescription>
        
        <div className="my-6 space-y-4">
          <div>
            <Label htmlFor="upiIdDisplay" className="text-sm font-medium text-muted-foreground">
              Pay to the following UPI ID:
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="upiIdDisplay"
                type="text"
                value={upiId}
                readOnly
                className="bg-muted/50 border-border focus-visible:ring-primary"
              />
              <Button variant="outline" size="icon" onClick={handleCopyUpiId} aria-label="Copy UPI ID">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            After completing the payment, click the button below to confirm.
          </p>
        </div>

        <DialogFooter className="sm:justify-between gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="default" onClick={onConfirm} className="bg-green-600 hover:bg-green-700 text-white">
            I have made the payment (₹{amount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
