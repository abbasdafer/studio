"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { DollarSign, Loader2 } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, getDocs, collection, query, where, runTransaction, DocumentSnapshot } from "firebase/firestore";


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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import type { PromoCode } from "./promo-code-manager";
import { Separator } from "./ui/separator";

const loginSchema = z.object({
  email: z.string().email({ message: "عنوان بريد إلكتروني غير صالح." }),
  password: z.string().min(1, { message: "كلمة المرور مطلوبة." }),
});

const signUpSchema = z.object({
  email: z.string().email({ message: "عنوان بريد إلكتروني غير صالح." }),
  password: z.string().min(8, { message: "يجب أن لا تقل كلمة المرور عن 8 أحرف." }),
  promoCode: z.string().min(1, { message: "رمز اشتراك صالح مطلوب." }),
  pricing: z.object({
      dailyFitness: z.coerce.number().min(0, "يجب أن يكون السعر موجبًا."),
      weeklyFitness: z.coerce.number().min(0, "يجب أن يكون السعر موجبًا."),
      monthlyFitness: z.coerce.number().min(0, "يجب أن يكون السعر موجبًا."),
      dailyIron: z.coerce.number().min(0, "يجب أن يكون السعر موجبًا."),
      weeklyIron: z.coerce.number().min(0, "يجب أن يكون السعر موجبًا."),
      monthlyIron: z.coerce.number().min(0, "يجب أن يكون السعر موجبًا."),
  })
});

type ValidationResult = 
  | { success: true; type: 'monthly' | 'yearly' }
  | { success: false; error: string };

const validateAndUsePromoCode = async (code: string): Promise<ValidationResult> => {
    const promoCodesRef = collection(db, "promoCodes");
    const q = query(promoCodesRef, where("code", "==", code.trim()));

    try {
        const result = await runTransaction(db, async (transaction) => {
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return { success: false, error: "رمز التفعيل غير صالح أو منتهي الصلاحية." };
            }

            const promoDocRef = querySnapshot.docs[0].ref;
            const transactionalPromoDoc = await transaction.get(promoDocRef);

            if (!transactionalPromoDoc.exists()) {
                 return { success: false, error: "رمز التفعيل غير صالح أو منتهي الصلاحية." };
            }

            const promoData = transactionalPromoDoc.data() as Omit<PromoCode, 'id'>;
            
            if (promoData.status !== 'active' || promoData.uses >= promoData.maxUses) {
                 return { success: false, error: "هذا الرمز تم استخدامه بالكامل أو غير نشط." };
            }
            
            const newUses = promoData.uses + 1;
            transaction.update(promoDocRef, { uses: newUses });
            
            return { success: true, type: promoData.type };
        });
        
        return result;

    } catch (error) {
        console.error("Promo code transaction failed: ", error);
        if (error instanceof Error && (error as any).code) {
           return { success: false, error: `حدث خطأ غير متوقع: ${(error as any).code}` };
        }
        return { success: false, error: "لا يمكن التحقق من رمز التفعيل. يرجى مراجعة سجلات الخادم." };
    }
};


export function AuthForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { 
        email: "", 
        password: "", 
        promoCode: "",
        pricing: {
            dailyFitness: 0,
            weeklyFitness: 0,
            monthlyFitness: 0,
            dailyIron: 0,
            weeklyIron: 0,
            monthlyIron: 0
        }
    },
  });

  const onLoginSubmit = async (values: z.infer<typeof loginSchema>) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({ title: "تم تسجيل الدخول بنجاح", description: "مرحبًا بعودتك!" });
      router.push("/dashboard");
    } catch (error: any) {
       console.error("Login failed:", error);
       toast({
        variant: "destructive",
        title: "فشل تسجيل الدخول",
        description: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSignUpSubmit = async (values: z.infer<typeof signUpSchema>) => {
    setLoading(true);
    try {
      const validationResult = await validateAndUsePromoCode(values.promoCode);
      
      if (!validationResult.success) {
        throw new Error(validationResult.error);
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      const startDate = new Date();
      const endDate = new Date();
      if (validationResult.type === 'monthly') {
          endDate.setMonth(startDate.getMonth() + 1);
      } else {
          endDate.setFullYear(startDate.getFullYear() + 1);
      }

      await setDoc(doc(db, "gymOwners", user.uid), {
          email: user.email,
          subscriptionType: validationResult.type,
          subscriptionStartDate: startDate,
          subscriptionEndDate: endDate,
          uid: user.uid,
          pricing: values.pricing, // Save the pricing structure
      });

      toast({
        title: "تم التسجيل بنجاح",
        description: "تم إنشاء حسابك بنجاح.",
      });
      router.push("/dashboard");

    } catch (error: any) {
      console.error("Sign up failed:", error);
      toast({
        variant: "destructive",
        title: "فشل التسجيل",
        description: error.message || "حدث خطأ أثناء التسجيل.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tabs defaultValue="login" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
        <TabsTrigger value="signup">إنشاء حساب</TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>تسجيل دخول مدير النادي</CardTitle>
            <CardDescription>
              أدخل بياناتك للوصول إلى لوحة التحكم الخاصة بك.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>البريد الإلكتروني</FormLabel>
                      <FormControl>
                        <Input placeholder="manager@gym.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>كلمة المرور</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  تسجيل الدخول
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="signup">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>إنشاء حساب النادي الخاص بك</CardTitle>
            <CardDescription>
              مطلوب رمز اشتراك فعال للتسجيل.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[60vh] overflow-y-auto">
            <Form {...signUpForm}>
              <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)} className="space-y-4">
                <div className="space-y-2">
                    <FormField
                    control={signUpForm.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>البريد الإلكتروني</FormLabel>
                        <FormControl>
                            <Input placeholder="your@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={signUpForm.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>كلمة المرور</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="يجب أن لا تقل عن 8 أحرف" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={signUpForm.control}
                    name="promoCode"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>رمز الاشتراك</FormLabel>
                        <FormControl>
                            <Input placeholder="أدخل الرمز الخاص بك" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h3 className="text-lg font-medium">أسعار الاشتراكات</h3>
                        <p className="text-sm text-muted-foreground">
                            حدد أسعار اشتراكات أعضائك.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-4 p-4 border rounded-lg">
                            <h4 className="font-medium text-center">أسعار اللياقة</h4>
                            <FormField
                                control={signUpForm.control}
                                name="pricing.dailyFitness"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>يومي</FormLabel>
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
                                control={signUpForm.control}
                                name="pricing.weeklyFitness"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>أسبوعي</FormLabel>
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
                                control={signUpForm.control}
                                name="pricing.monthlyFitness"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>شهري</FormLabel>
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

                         <div className="space-y-4 p-4 border rounded-lg">
                            <h4 className="font-medium text-center">أسعار الحديد</h4>
                            <FormField
                                control={signUpForm.control}
                                name="pricing.dailyIron"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>يومي</FormLabel>
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
                                control={signUpForm.control}
                                name="pricing.weeklyIron"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>أسبوعي</FormLabel>
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
                                control={signUpForm.control}
                                name="pricing.monthlyIron"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>شهري</FormLabel>
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
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  إنشاء حساب
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
