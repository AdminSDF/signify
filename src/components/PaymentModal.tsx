"use client";

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Image from 'next/image';
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
import { copyToClipboard } from '@/lib/utils';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  upiId: string;
  appName: string;
  amount: number;
  tierName?: string;
}

const upiApps = [
  { name: 'Google Pay', logoUrl: 'https://placehold.co/80x80.png', dataAiHint: 'google pay logo', scheme: 'gpay://upi/pay' },
  { name: 'PhonePe', logoUrl: 'https://placehold.co/80x80.png', dataAiHint: 'phonepe logo', scheme: 'phonepe://pay' },
  { name: 'Paytm', logoUrl: 'https://placehold.co/80x80.png', dataAiHint: 'paytm logo', scheme: 'paytmmp://upi/pay' },
  { name: 'Amazon Pay', logoUrl: 'https://placehold.co/80x80.png', dataAiHint: 'amazon pay logo', scheme: 'amazonpay://pay' },
  { name: 'BHIM', logoUrl: 'https://placehold.co/80x80.png', dataAiHint: 'bhim upi logo', scheme: 'bhim://upi/pay' },
  { name: 'Other Apps', logoUrl: 'https://placehold.co/80x80.png', dataAiHint: 'upi logo', scheme: 'upi://pay' },
];


const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  upiId,
  appName,
  amount,
  tierName
}) => {
  const { toast } = useToast();
  const [upiPaymentLink, setUpiPaymentLink] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isOpen && upiId && amount > 0 && appName) {
      const payeeName = encodeURIComponent(appName);
      const transactionNote = encodeURIComponent(`Add ₹${amount} to ${tierName || appName}`);
      const link = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${amount.toFixed(2)}&cu=INR&tn=${transactionNote}`;
      setUpiPaymentLink(link);
    }
  }, [isOpen, upiId, amount, appName, tierName]);

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
  
  const getAppSpecificLink = (scheme: string) => {
    if (!upiId || !appName || amount <= 0) return '#';
    const payeeName = encodeURIComponent(appName);
    const transactionNote = encodeURIComponent(`Add ₹${amount} to ${tierName || appName}`);
    const queryString = `?pa=${upiId}&pn=${payeeName}&am=${amount.toFixed(2)}&cu=INR&tn=${transactionNote}`;
    return `${scheme}${queryString}`;
  }

  const descriptionText = <>To continue, you need to add at least <span className="font-bold text-primary">₹{amount.toFixed(2)}</span> to your {tierName ? <span className="font-bold text-primary">{tierName}</span> : ''} balance.</>;
  
  const modalTitle = "Add Balance";

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
                Scan QR to pay <span className="font-bold text-primary">₹{amount.toFixed(2)}</span>
              </p>
              <div className="p-2 bg-white rounded-md shadow-md inline-block">
                <QRCodeSVG value={upiPaymentLink} size={160} includeMargin={false} />
              </div>
            </div>
          )}

          <div>
             <Label className="text-sm font-medium text-muted-foreground text-center block mb-3">
              Or, pay using your favorite app:
            </Label>
            <div className="grid grid-cols-3 gap-4">
              {isClient && upiApps.map((app) => (
                 <a 
                   key={app.name} 
                   href={getAppSpecificLink(app.scheme)}
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="flex flex-col items-center justify-start gap-2 p-2 rounded-lg hover:bg-muted transition-colors h-24"
                 >
                   <Image src={app.logoUrl} alt={`${app.name} logo`} width={48} height={48} className="rounded-full" data-ai-hint={app.dataAiHint} />
                   <span className="text-xs text-center font-medium text-foreground">{app.name}</span>
                 </a>
              ))}
            </div>
          </div>

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
          <Button type="button" variant="default" onClick={onConfirm} className="w-full sm:w-auto">
            I have made the payment (₹{amount.toFixed(2)})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
