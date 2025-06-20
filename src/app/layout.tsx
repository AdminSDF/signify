
import type {Metadata} from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import NewsTicker from '@/components/NewsTicker';
import { AuthProvider } from '@/context/AuthContext'; // Import AuthProvider

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'], 
  variable: '--font-poppins', 
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Removed amp-auto-ads script as this is not an AMP page */}
      </head>
      <body className={`${poppins.className} font-body antialiased min-h-screen flex flex-col`}>
        {/* Removed amp-auto-ads tag */}
        <AuthProvider> {/* Wrap with AuthProvider */}
          <SiteHeader />
          <NewsTicker />
          <main className="flex-grow container mx-auto px-4 py-8">
            {children}
          </main>
          <SiteFooter />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
