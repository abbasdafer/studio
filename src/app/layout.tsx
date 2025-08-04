import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { Tajawal } from 'next/font/google'

const tajawal = Tajawal({ subsets: ['arabic'], weight: ['400', '700'], variable: '--font-tajawal' })

export const metadata: Metadata = {
  title: 'جيم باس برو',
  description: 'إدارة اشتراكات النادي الرياضي بسهولة.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
       <body className={`${tajawal.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
