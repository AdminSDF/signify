
"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { HelpCircle, Image as ImageIcon, XCircle, Send } from 'lucide-react';
import { createSupportTicket } from '@/lib/firebase';

export default function HelpPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [description, setDescription] = useState('');
    const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast({ title: 'File too large', description: 'Please select an image smaller than 5MB.', variant: 'destructive' });
                return;
            }
            setScreenshotFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleRemoveScreenshot = () => {
        setScreenshotFile(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        // Reset file input
        const fileInput = document.getElementById('screenshot') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast({ title: "Login Required", description: "You must be logged in to submit a ticket.", variant: "destructive" });
            return;
        }
        if (description.trim().length < 10) {
            toast({ title: "Description too short", description: "Please describe your issue in at least 10 characters.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            await createSupportTicket({
                userId: user.uid,
                userEmail: user.email || 'N/A',
                description: description.trim(),
                screenshotFile: screenshotFile,
            });
            toast({ title: "Ticket Submitted!", description: "Our team will look into your issue shortly. Thank you!" });
            setDescription('');
            handleRemoveScreenshot();
            router.push('/');
        } catch (error: any) {
            console.error("Error submitting support ticket:", error);
            toast({ title: "Submission Failed", description: error.message || "Could not submit your ticket. Please try again.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (loading) {
         return (
          <div className="flex-grow flex flex-col items-center justify-center p-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        );
    }
    
    if (!user && !loading) {
        // Use router in a client component after checks
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
            router.push('/login');
        }, [router]);
        return null;
    }

    return (
        <div className="container mx-auto py-8">
            <Card className="w-full max-w-2xl mx-auto shadow-xl">
                <CardHeader className="text-center">
                    <HelpCircle className="h-12 w-12 mx-auto text-primary mb-4" />
                    <CardTitle className="text-3xl font-bold font-headline text-primary">Help & Support</CardTitle>
                    <CardDescription className="text-muted-foreground">Having an issue? Let us know!</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-lg">Describe your issue</Label>
                            <Textarea
                                id="description"
                                placeholder="Please provide as much detail as possible, including what you were doing when the problem occurred."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                minLength={10}
                                rows={6}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="screenshot" className="text-lg">Add a Screenshot (Optional)</Label>
                            <Input
                                id="screenshot"
                                type="file"
                                accept="image/png, image/jpeg, image/gif"
                                onChange={handleFileChange}
                                disabled={isSubmitting}
                            />
                        </div>

                        {previewUrl && (
                            <div className="relative w-full max-w-sm mx-auto border p-2 rounded-md">
                                <Image src={previewUrl} alt="Screenshot preview" width={400} height={300} className="rounded-md object-contain max-h-60 w-auto mx-auto" />
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
                                    onClick={handleRemoveScreenshot}
                                >
                                    <XCircle className="h-5 w-5" />
                                </Button>
                            </div>
                        )}
                        
                        <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting || description.trim().length < 10}>
                            {isSubmitting ? (
                                <><div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary-foreground mr-2"></div> Submitting...</>
                            ) : (
                                <><Send className="mr-2 h-5 w-5" /> Submit Ticket</>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
