
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
  {
    name: 'Google Pay',
    scheme: 'gpay://upi/pay',
    logo: (
      <svg className="w-12 h-12" viewBox="0 0 60 60">
        <rect width="60" height="60" rx="12" fill="#fff" stroke="#e0e0e0" strokeWidth="1"></rect>
        <path d="M25.26 21.68L29.1 29.5l-3.84 7.82h3.2l2.3-4.87h.08c.55 1.7 1.48 3.23 2.76 4.3l-2.04 4.25h3.3l5.5-11.45V21.68h-9.9v.01zm6.04 7.2l-2.1-4.48h-.06l-2.12 4.48h4.28z" fill="#5f6368"></path>
        <path d="M22.95 38.38A5.36 5.36 0 0117.6 33a5.36 5.36 0 015.36-5.36c1.63 0 3.03.73 4 1.9l-2.03 1.52a2.33 2.33 0 00-1.93-1c-1.39 0-2.52 1.13-2.52 2.94s1.13 2.94 2.52 2.94c1.6 0 2.22-1.04 2.33-1.63h-2.33v-2.3h5.45c.05.3.08.6.08.92a4.8 4.8 0 01-1.37 3.5 5.2 5.2 0 01-4.14 2.1z" fill="#4285f4"></path>
      </svg>
    ),
  },
  {
    name: 'PhonePe',
    scheme: 'phonepe://pay',
    logo: (
      <svg className="w-12 h-12" viewBox="0 0 60 60">
        <rect width="60" height="60" rx="12" fill="#5f259f"></rect>
        <path fill="#fff" d="M36.14 28.52h-2.73l-.48-2.11h-3.87l-.48 2.1h-2.74l3.92-10.26h2.43l3.95 10.25zm-4.65-3.82l-1.22-5.32-1.22 5.32h2.44z"></path>
      </svg>
    ),
  },
  {
    name: 'Paytm',
    scheme: 'paytmmp://upi/pay',
    logo: (
      <Image
        src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi5p1fz2AkgiC0Ynf9yfNXRrDv_4eGUpZaJGsyUvrmRXwBPApxasiKbLTmtPvgg7IZvwFZeKg0Q08LoJnkqOfyCCHhGD74iBTqAgJN-tUl2JT3Z3lvqK9sUIWMUbRU0CVJGwDKEt00GBqklWXpVK0q-pmtSmVLQKgfCttSWbfUEsxljsu2vppBkR8bBvzlF/s1600/20250623_144523.png"
        alt="Paytm Logo"
        width={48}
        height={48}
        className="w-12 h-12 rounded-lg"
      />
    ),
  },
  {
    name: 'Amazon Pay',
    scheme: 'amazonpay://pay',
    logo: (
      <Image
        src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgsgJohh97ZSjiCyaGtNy43jwk9bt35M6lDOqnCUuho00sFe-8hi7p9XeuIii41iZc1qsDuiNdhQT4C4sJsfQSdSlzkj1q7SkeWZPS2cePaZ45SF-JAb0Fe2M5fqfOkilsdNbGhW5YnhNyRnGMtpSRYMQ05J700ToVHU9vkyTsVE1xQ6Xp6JLC9P1gvWGNC/s225/images%20%281%29.png"
        alt="Amazon Pay Logo"
        width={48}
        height={48}
        className="w-12 h-12 rounded-lg"
      />
    ),
  },
  {
    name: "BHIM",
    scheme: "bhim://upi/pay",
    logo: (
        <svg className="w-12 h-12" viewBox="0 0 60 60">
            <rect width="60" height="60" rx="12" fill="#003e7b"/>
            <path d="M38.8,33.5h-5.3v-2.3c1-0.7,1.7-1.8,1.7-3.1c0-2-1.6-3.6-3.6-3.6s-3.6,1.6-3.6,3.6c0,1.3,0.7,2.4,1.7,3.1v2.3h-5.3 c-0.6,0-1,0.4-1,1v5.8c0,0.6,0.4,1,1,1h14.4c0.6,0,1-0.4,1-1v-5.8C39.8,33.9,39.4,33.5,38.8,33.5z M29.9,30.1 c0-1,0.8-1.8,1.8-1.8s1.8,0.8,1.8,1.8c0,1-0.8,1.8-1.8,1.8S29.9,31.1,29.9,30.1z M34.9,38.5h-2.9v-2.1h2.9V38.5z M27.9,38.5h-2.9 v-2.1h2.9V38.5z" fill="#ff6700"/>
            <path d="M21.5,18.7h17c0.6,0,1,0.4,1,1v4.2h-3.4v-3.2H23.9v10.5h3.9v-3.2h3.4v4.2c0,0.6-0.4,1-1,1h-7.3c-0.6,0-1-0.4-1-1v-12.5 C20.5,19.1,20.9,18.7,21.5,18.7z" fill="#009c48"/>
        </svg>
    ),
  },
  {
    name: "Other Apps",
    scheme: "upi://pay",
    logo: (
        <svg className="w-12 h-12" viewBox="0 0 60 60">
            <rect width="60" height="60" rx="12" fill="#e0e0e0"/>
            <path d="M22,29h2.5v-8.3h3.4V29H30v1.9h-8V29z M32.1,29h2.1l3-6.7h0.1V29h1.9v-10.2h-2.2l-2.9,6.5h-0.1v-6.5h-1.9V30.9z" fill="#757575"/>
        </svg>
    ),
  },
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
                   {app.logo}
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
