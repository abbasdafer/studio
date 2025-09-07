
"use client";

import { useTransition } from 'react';
import { Check, MoreHorizontal, Moon, ShieldCheck, ShieldOff, Sun, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { updateUserSubscription } from '@/lib/actions';
import { GymOwnerAccount } from '@/app/admin/users/page';

export function SubscriptionActions({ user }: { user: GymOwnerAccount }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleAction = (type: 'monthly' | '6-months' | 'yearly' | 'deactivate') => {
    startTransition(async () => {
      const result = await updateUserSubscription(user.uid, type);
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
        <DropdownMenuLabel>تعديل الاشتراك</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => handleAction('monthly')} disabled={isPending}>
          <ShieldCheck className="ml-2 h-4 w-4 text-green-500" />
          تفعيل اشتراك شهري
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleAction('6-months')} disabled={isPending}>
          <ShieldCheck className="ml-2 h-4 w-4 text-green-500" />
          تفعيل اشتراك 6 أشهر
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleAction('yearly')} disabled={isPending}>
          <ShieldCheck className="ml-2 h-4 w-4 text-green-500" />
          تفعيل اشتراك سنوي
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => handleAction('deactivate')} disabled={isPending} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
          <ShieldOff className="ml-2 h-4 w-4" />
          تعطيل الحساب
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
