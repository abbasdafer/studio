
'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GymOwnerAccount } from "@/app/admin/users/page";
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateUserSubscription } from '@/lib/actions';
import { Loader2 } from 'lucide-react';

export function UsersTable({ users }: { users: GymOwnerAccount[] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [identifier, setIdentifier] = useState('');

    const handleDeactivate = () => {
        if (!identifier.trim()) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'يرجى إدخال معرّف المستخدم أو بريده الإلكتروني.' });
            return;
        }

        startTransition(async () => {
            // Note: This action currently simulates the deactivation.
            // A real implementation requires a secure backend function.
            // The UID/email would be passed to that function to find and update the user.
            const result = await updateUserSubscription(identifier, 'deactivate');
            if (result.success) {
                toast({ title: "نجاح", description: result.message });
                setIdentifier(''); // Clear input on success
            } else {
                toast({ variant: 'destructive', title: "خطأ", description: result.error });
            }
        });
    };

  return (
    <Card>
      <CardHeader>
        <CardTitle>إدارة المستخدمين</CardTitle>
        <CardDescription>
            هذه الواجهة مخصصة للإجراءات الإدارية الأساسية. حاليًا، لا يمكن عرض جميع المستخدمين لأسباب أمنية.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-6 border rounded-lg bg-background space-y-4">
            <h3 className="font-semibold">تعطيل حساب مستخدم</h3>
            <p className="text-sm text-muted-foreground">
                لتعطيل حساب، أدخل معرّف المستخدم (UID) أو بريده الإلكتروني. هذا الإجراء سيمنعه من تسجيل الدخول.
            </p>
             <div className="space-y-2">
                <Label htmlFor="user-identifier">معرّف المستخدم أو بريده الإلكتروني</Label>
                <Input 
                    id="user-identifier"
                    placeholder="أدخل UID أو email هنا"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                />
            </div>
            <Button onClick={handleDeactivate} variant="destructive" disabled={isPending}>
                 {isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                تعطيل الحساب
            </Button>
        </div>
        <div className="p-4 text-center text-muted-foreground bg-muted/50 rounded-lg">
          <p className="text-sm">سيتم تطوير هذه الصفحة في المستقبل لعرض قائمة كاملة بالمستخدمين عند توصيلها ببيئة خادم آمنة.</p>
        </div>
      </CardContent>
    </Card>
  );
}
