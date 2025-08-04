"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";

const ADMIN_EMAIL = "admin@gympro.app";

export default function AdminLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!password) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "كلمة المرور مطلوبة.",
      });
      return;
    }
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
      toast({ title: "تم منح الوصول", description: "جاري إعادة التوجيه إلى لوحة الإدارة..." });
      router.push("/admin/promo-codes");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "تم رفض الوصول",
        description: "كلمة المرور التي أدخلتها غير صحيحة.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
          <CardTitle>وصول المسؤول</CardTitle>
          <CardDescription>
            أدخل كلمة مرور المسؤول لإدارة أكواد التفعيل.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleLogin} disabled={loading}>
            {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            فتح
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
