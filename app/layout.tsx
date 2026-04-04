import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import SupportBubble from '@/components/SupportBubble';

export const metadata: Metadata = {
  title: {
    default: 'Charley Stores – Premium Golf Equipment',
    template: '%s | Charley Stores',
  },
  description: 'Shop premium Charley Stores golf clubs, balls, bags, and accessories. Fast delivery across South Africa.',
  keywords: 'Charley Stores, golf, clubs, drivers, irons, putters, golf balls, South Africa',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Roboto:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body min-h-screen flex flex-col">
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <CartDrawer />
            <main className="flex-1 pt-[96px]">
              {children}
            </main>
            <SupportBubble />
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
