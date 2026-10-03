import type { Metadata } from 'next';
import './globals.css';
import { StatusBanner } from '@/components/layout/StatusBanner';

export const metadata: Metadata = {
  title: 'SupplyFlow | Predictive Logistics Decision Support',
  description: 'Predictive Logistics & Forward Supply Chain for High-Altitude Sectors (PS 26251)',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-tactical-950 text-tactical-100 flex flex-col">
        <StatusBanner />
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
