import type {Metadata} from 'next';
import { Poppins } from 'next/font/google'; // Using next/font for optimal loading
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

// Configure Poppins font
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'], // Specify weights you need
  variable: '--font-poppins', // Optional: if you want to use it as a CSS variable
});

export const metadata: Metadata = {
  title: 'Spinify - Spin to Earn!',
  description: 'A fun and engaging Spin to Earn game by Firebase Studio',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning> {/* Added suppressHydrationWarning for potential theme mismatches */}
      <head>
        {/* Google Fonts links are managed by next/font, so explicit links are not needed here if using next/font */}
        {/* Add other head elements if necessary */}
      </head>
      <body className={`${poppins.className} font-body antialiased min-h-screen flex flex-col`}>
        <SiteHeader />
        <main className="flex-grow container mx-auto px-4 py-8">
          {children}
        </main>
        <SiteFooter />
        <Toaster />
      </body>
    </html>
  );
}
