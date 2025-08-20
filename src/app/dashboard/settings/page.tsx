
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { DollarSign, Loader2, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { ErrorDisplay } from "@/components/error-display";


const pricingSchema = z.object({
  dailyFitness: z.coerce.number().min(0, "يجب أن يكون السعر موجبًا."),
  weeklyFitness: z.coerce.number().min(0, "يجب أن يكون السعر موجبًا."),
  monthlyFitness: z.coerce.number().min(0, "يجب أن يكون السعر موجبًا."),
  dailyIron: z.coerce.number().min(0, "يجب أن يكون السعر موجبًا."),
  weeklyIron: z.coerce.number().min(0, "يجب أن يكون السعر موجبًا."),
  monthlyIron: z.coerce.number().min(0, "يجب أن يكون السعر موجبًا."),
});

type PricingFormValues = z.infer<typeof pricingSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PricingFormValues>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      dailyFitness: 0,
      weeklyFitness: 0,
      monthlyFitness: 0,
      dailyIron: 0,
      weeklyIron: 0,
      monthlyIron: 0,
    },
  });

  useEffect(() => {
    const fetchPricing = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const ownerDocRef = doc(db, 'gymOwners', user.uid);
        const ownerDoc = await getDoc(ownerDocRef);

        if (ownerDoc.exists()) {
          const pricingData = ownerDoc.data().pricing;
          if (pricingData) {
            form.reset(pricingData);
          }
        } else {
            throw new Error("لم يتم العثور على بيانات مالك النادي. لا يمكن تحميل الإعدادات.");
        }
      } catch (e) {
        console.error("Error fetching pricing settings: ", e);
        setError((e as Error).message || "فشل في تحميل إعدادات الأسعار.");
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, [user, form]);

  const onSubmit = async (data: PricingFormValues) => {
    if (!user) return;
    setSaving(true);
    try {
      const ownerDocRef = doc(db, 'gymOwners', user.uid);
      await updateDoc(ownerDocRef, {
        pricing: data,
      });
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم تحديث أسعار الاشتراكات الخاصة بك.",
      });
    } catch (e) {
      console.error("Error saving pricing settings: ", e);
      toast({
        variant: "destructive",
        title: "خطأ في الحفظ",
        description: "فشل في تحديث الأسعار. يرجى المحاولة مرة أخرى.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-8">
                 <Skeleton className="h-40 w-full" />
                 <Skeleton className="h-10 w-24 self-end" />
            </CardContent>
        </Card>
    );
  }

  if (error) {
      return <ErrorDisplay title="فشل تحميل الإعدادات" message={error} />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>إعدادات النادي</CardTitle>
        <CardDescription>
          قم بتحديث إعدادات الأسعار الخاصة باشتراكات أعضائك هنا.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4">
                <div className="space-y-1">
                    <h3 className="text-lg font-medium text-primary">أسعار اشتراكات اللياقة</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="dailyFitness"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>السعر اليومي</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <DollarSign className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input type="number" placeholder="0.00" className="pr-8" {...field} />
                                </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="weeklyFitness"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>السعر الأسبوعي</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <DollarSign className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input type="number" placeholder="0.00" className="pr-8" {...field} />
                                </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="monthlyFitness"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>السعر الشهري</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <DollarSign className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input type="number" placeholder="0.00" className="pr-8" {...field} />
                                </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            <Separator />

            <div className="space-y-4">
                <div className="space-y-1">
                     <h3 className="text-lg font-medium text-primary">أسعار اشتراكات الحديد</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="dailyIron"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>السعر اليومي</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <DollarSign className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input type="number" placeholder="0.00" className="pr-8" {...field} />
                                </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="weeklyIron"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>السعر الأسبوعي</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <DollarSign className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input type="number" placeholder="0.00" className="pr-8" {...field} />
                                </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="monthlyIron"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>السعر الشهري</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <DollarSign className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input type="number" placeholder="0.00" className="pr-8" {...field} />
                                </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            <div className="flex justify-end">
                 <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    حفظ التغييرات
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
