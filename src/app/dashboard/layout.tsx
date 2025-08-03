'use client';

import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import { Dumbbell, LineChart, Users } from 'lucide-react';
import { UserNav } from '@/components/user-nav';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isSubscriptionActive } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
    if (!loading && !isSubscriptionActive) {
      router.push('/');
    }
  }, [loading, user, isSubscriptionActive, router]);

  if (loading || !user || !isSubscriptionActive) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 sm:px-8">
          <div className="flex items-center gap-4">
            <Dumbbell className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">Gym Admin</h1>
          </div>
          <Skeleton className="h-9 w-9 rounded-full" />
        </header>
        <main className="flex-1 p-4 md:p-8">
          <div className="container mx-auto">
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-muted-foreground">
                Verifying subscription...
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  const navLinks = [
      { href: '/dashboard', label: 'Members', icon: Users },
      { href: '/dashboard/profits', label: 'Profits', icon: LineChart },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 sm:px-8">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-primary" />
            <h1 className="hidden md:block text-xl font-bold tracking-tight">Gym Admin</h1>
          </div>
          <nav className="flex items-center gap-4">
              {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                        "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                        pathname === link.href ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
              ))}
          </nav>
        </div>
        <UserNav />
      </header>
      <main className="flex-1 p-4 md:p-8">
          {children}
      </main>
    </div>
  );
}
