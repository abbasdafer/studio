'use client';

import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import { Dumbbell, LineChart, Users, Loader2 } from 'lucide-react';
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
    if (!loading && (!user || !isSubscriptionActive)) {
      router.push('/');
    }
  }, [loading, user, isSubscriptionActive, router]);

  // This is a robust loading state that prevents any child components from rendering
  // until we are certain the user is authenticated and has an active subscription.
  if (loading || !user || !isSubscriptionActive) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
         <div className="flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-primary animate-bounce" />
            <h1 className="text-xl font-bold tracking-tight">جيمكو</h1>
          </div>
        <div className="mt-4 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin ml-2" />
            <span>جاري التحقق من الجلسة...</span>
        </div>
      </div>
    );
  }
  
  const navLinks = [
      { href: '/dashboard', label: 'الأعضاء', icon: Users },
      { href: '/dashboard/profits', label: 'الأرباح', icon: LineChart },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 sm:px-8">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-primary" />
            <h1 className="hidden md:block text-xl font-bold tracking-tight">لوحة تحكم النادي</h1>
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
                    <link.icon className="h-4 w-4 ml-1" />
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
