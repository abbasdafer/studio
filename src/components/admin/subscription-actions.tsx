
"use client";

import { useTransition } from 'react';
import { MoreHorizontal, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { updateUserSubscription } from '@/lib/actions';
import type { GymOwnerAccount } from '@/app/admin/users/page';

export function SubscriptionActions({ user }: { user: GymOwnerAccount }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleDeactivate = () => {
    startTransition(async () => {
      // For now, this only supports deactivation as it's the agreed-upon simplification.
      const result = await updateUserSubscription(user.uid, 'deactivate');
      if (result.success) {
        toast({ title: "نجاح", description: result.message });
      } else {
        toast({ variant: 'destructive', title: "خطأ", description: result.error });
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-haspopup="true" size="icon" variant="ghost">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">تبديل القائمة</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
        <DropdownMenuItem onSelect={handleDeactivate} disabled={isPending} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
          <ShieldOff className="ml-2 h-4 w-4" />
          تعطيل الحساب
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
