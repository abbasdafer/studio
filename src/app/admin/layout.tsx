
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, TicketPercent } from 'lucide-react';

import { cn } from '@/lib/utils';
import { UserNav } from '@/components/user-nav';


const navLinks = [
    { href: '/admin/promo-codes', label: 'أكواد التفعيل', icon: TicketPercent },
];


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
       <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-background sm:flex">
        <div className="flex h-16 items-center border-b px-6">
            <Link href="/admin/promo-codes" className="flex items-center gap-2 font-semibold">
                <Shield className="h-6 w-6 text-primary" />
                <span>لوحة تحكم المسؤول</span>
            </Link>
        </div>
        <nav className="flex-1 space-y-2 p-4">
            {navLinks.map((link) => (
                 <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                        pathname === link.href && "bg-muted text-primary"
                    )}
                    >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                </Link>
            ))}
        </nav>
      </aside>
       <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-60">
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                {/* Mobile Menu */}
                <div className='sm:hidden'>
                     <Link href="/admin/promo-codes" className="flex items-center gap-2 font-semibold">
                        <Shield className="h-6 w-6 text-primary" />
                    </Link>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <UserNav />
                </div>
            </header>
            <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                {children}
            </main>
             {/* Mobile Navigation */}
            <nav className="sm:hidden fixed bottom-0 left-0 right-0 border-t bg-card p-2 flex justify-around">
                {navLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-md transition-colors text-xs",
                            pathname.startsWith(link.href) ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted"
                        )}
                    >
                        <link.icon className="h-5 w-5" />
                        <span>{link.label}</span>
                    </Link>
                ))}
            </nav>
            <div className="sm:hidden h-16" />
       </div>
    </div>
  );
}
