
"use client";

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
import { Copy, CreditCard, ExternalLink, QrCode } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  upiId: string;
  appName: string; // Added for Payee Name in UPI link
  amount: number;
  spinsToGet?: number; 
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  upiId,
  appName,
  amount,
  spinsToGet,
}) => {
  const { toast } = useToast();
  const [upiPaymentLink, setUpiPaymentLink] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isOpen && upiId && amount > 0 && appName) {
      // Standard UPI deeplink format:
      // upi://pay?pa={upi_id}&pn={payee_name}&am={amount}&cu=INR&tn={transaction_note}
      // Ensure appName is URL encoded if it can contain special characters
      const payeeName = encodeURIComponent(appName);
      const transactionNote = encodeURIComponent(spinsToGet ? `Buy ${spinsToGet} Spins for ${appName}` : `Add Balance to ${appName}`);
      const link = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${amount.toFixed(2)}&cu=INR&tn=${transactionNote}`;
      setUpiPaymentLink(link);
    }
  }, [isOpen, upiId, amount, appName, spinsToGet]);

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

  const descriptionText = spinsToGet && spinsToGet > 0 
    ? <>Get <span className="font-bold text-primary">{spinsToGet} spins</span> for just <span className="font-bold text-primary">₹{amount.toFixed(2)}</span>!</>
    : <>You are about to add <span className="font-bold text-primary">₹{amount.toFixed(2)}</span> to your balance.</>;
  
  const modalTitle = spinsToGet && spinsToGet > 0 ? "Purchase More Spins" : "Add Balance";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-headline">
            <CreditCard className="w-7 h-7 text-primary" />
            {modalTitle}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="mt-2 text-base text-center">
          {descriptionText}
        </DialogDescription>
        
        <div className="my-6 space-y-6">
          {isClient && upiPaymentLink && amount > 0 && (
            <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-muted/20">
              <p className="text-sm font-medium text-muted-foreground text-center">
                Scan QR or click link to pay <span className="font-bold text-primary">₹{amount.toFixed(2)}</span>
              </p>
              <div className="p-2 bg-white rounded-md shadow-md inline-block">
                <QRCodeSVG value={upiPaymentLink} size={160} includeMargin={false} />
              </div>
              <a
                href={upiPaymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button variant="outline" className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Pay with UPI App (₹{amount.toFixed(2)})
                </Button>
              </a>
            </div>
          )}

          <div>
            <Label htmlFor="upiIdDisplay" className="text-sm font-medium text-muted-foreground">
              Or, manually pay to UPI ID:
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
            Your request will be reviewed by an admin.
          </p>
        </div>

        <DialogFooter className="sm:justify-between gap-2 flex-col sm:flex-row">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="button" variant="default" onClick={onConfirm} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
            I have made the payment (₹{amount.toFixed(2)})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
