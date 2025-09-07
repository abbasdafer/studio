
"use client";

import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, LineChart, Settings } from "lucide-react";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";

export function UserNav() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  if (loading) {
    return <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />;
  }
  
  if (!user) {
    // This shouldn't happen on a protected page, but as a fallback
    router.push("/");
    return null;
  }
  
  const getInitials = (email?: string | null, phone?: string | null) => {
      if (email) {
          return email.charAt(0).toUpperCase();
      }
      if (phone) {
          // Get last two digits as initials for privacy
          return phone.slice(-2);
      }
      return 'U'; // U for User
  }

  return (
    <div className="flex items-center gap-4">
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
                {/* You can add user avatar logic here later */}
                <AvatarFallback>{getInitials(user.email, user.phoneNumber)}</AvatarFallback>
            </Avatar>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">مدير النادي</p>
                <p className="text-xs leading-none text-muted-foreground">
                {user.email || user.phoneNumber}
                </p>
            </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
            <DropdownMenuItem asChild>
                <Link href="/dashboard/profits">
                    <LineChart className="ml-2 h-4 w-4" />
                    <span>الأرباح</span>
                </Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
                <User className="ml-2 h-4 w-4" />
                <span>الملف الشخصي</span>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">
                    <Settings className="ml-2 h-4 w-4" />
                    <span>الإعدادات</span>
                </Link>
            </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="ml-2 h-4 w-4" />
            <span>تسجيل الخروج</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
    </div>
  );
}
