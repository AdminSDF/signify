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
       <svg className="w-12 h-12" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <path fill="#4285f4" d="M312.982 225.428h138.032v61.188H312.982z"/>
        <path fill="#34a853" d="M312.982 318.918h138.032v61.188H312.982z"/>
        <path d="m201.378 193.128 66.388 66.388-66.388 66.388-23.013-23.013c-25.202-25.202-25.202-66.097 0-91.299l23.013-18.464z" fill="#fbbc05"/>
        <path d="m201.378 193.128-66.388-66.388 23.013-23.013c25.202-25.202 66.097-25.202 91.3 0l18.463 18.464-66.388 70.937z" fill="#ea4335"/>
        <path fill="#ea4335" d="M60.986 225.428h138.032v61.188H60.986z"/>
        <path d="M60.986 225.428c0-50.373 40.815-91.188 91.188-91.188h2.36v152.376h-2.36c-50.373 0-91.188-40.815-91.188-91.188z" fill="#4285f4"/>
      </svg>
    ),
  },
  {
    name: 'PhonePe',
    scheme: 'phonepe://pay',
    logo: (
      <svg className="w-12 h-12" viewBox="0 0 60 60">
        <rect width="60" height="60" rx="12" fill="#5f259f"></rect>
        <text x="30" y="37" fontFamily="sans-serif" fontSize="11" fill="#ffffff" textAnchor="middle" fontWeight="bold">PhonePe</text>
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
      <Image
        src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEg7Ot3I7AvA-b8urS6AsAiY62IbnEv9SIqnl4DGvZE5hc8xgIn_1xnKxUwuk7A2gfSnmYB-EpynM63dXfn68-r0wlchBmgQsERFHHTIGqwTWkYJbnY7YKKHdFHnen3sXWWqFB7GDOg6u2N6DwyDIelcjiMFV50NQBPmW-hBb_KC7E8du7Tq_4iohyAwsvep/s400/20250623_144600.png"
        alt="BHIM Logo"
        width={48}
        height={48}
        className="w-12 h-12 rounded-lg"
      />
    ),
  },
  {
    name: "Other Apps",
    scheme: "upi://pay",
    logo: (
      <svg className="w-12 h-12" viewBox="0 0 60 60">
        <rect width="60" height="60" rx="12" fill="#fff" stroke="#e0e0e0" strokeWidth="1"></rect>
        <text x="30" y="37" fontFamily="sans-serif" fontSize="18" fill="#5f6368" textAnchor="middle" fontWeight="bold">UPI</text>
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
      <DialogContent className="sm:max-w-md bg-card text-card-foreground flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-2xl font-headline">
            <CreditCard className="w-7 h-7 text-primary" />
            {modalTitle}
          </DialogTitle>
           <DialogDescription className="pt-2 text-base text-center">
            {descriptionText}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto my-2 -mx-2 px-2">
            <div className="space-y-6">
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
        </div>

        <DialogFooter className="sm:justify-between gap-2 flex-col sm:flex-row flex-shrink-0">
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
