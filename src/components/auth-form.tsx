
"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Phone, Lock } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
} from "firebase/auth";
import { doc, setDoc, getDocs, collection, query, where, runTransaction, getDoc, serverTimestamp } from "firebase/firestore";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import type { PromoCode } from "./promo-code-manager";
import { Separator } from "./ui/separator";
import { Checkbox } from "./ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

// Schemas
const loginSchema = z.object({
  identifier: z.string().min(1, { message: "الرجاء إدخال بريد إلكتروني أو رقم هاتف." }),
  password: z.string().min(1, { message: "كلمة المرور مطلوبة." }),
});

const signupSchema = z.object({
  identifier: z.string().min(1, { message: "الرجاء إدخال بريد إلكتروني أو رقم هاتف." }),
  password: z.string().min(8, { message: "يجب أن لا تقل كلمة المرور عن 8 أحرف." }),
  promoCode: z.string().min(1, { message: "رمز الاشتراك أو الهدية مطلوب." }),
  pricing: z.object({
    dailyFitness: z.coerce.number().min(0, "يجب أن يكون السعر موجبًا."),
    weeklyFitness: z.coerce.number().min(0, "يجب أن يكون السعر موجبًا."),
    monthlyFitness: z.coerce.number().min(0, "يجب أن يكون السعر موجبًا."),
    dailyIron: z.coerce.number().min(0, "يجب أن يكون السعر موجبًا."),
    weeklyIron: z.coerce.number().min(0, "يجب أن يكون السعر موجبًا."),
    monthlyIron: z.coerce.number().min(0, "يجب أن يكون السعر موجبًا."),
  }),
  terms: z.boolean().refine((val) => val === true, {
    message: "يجب الموافقة على شروط الخدمة للمتابعة.",
  }),
});

const otpSchema = z.object({
  otp: z.string().min(6, { message: "الرجاء إدخال رمز التحقق المكون من 6 أرقام." }),
});

// Helper Functions
const isEmail = (text: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
const isPhoneNumber = (text: string) => /^\+?[1-9]\d{1,14}$/.test(text);

type ValidationResult =
  | { success: true; type: 'monthly' | 'yearly' | '6-months' | 'gift' }
  | { success: false; error: string };

const validateAndUsePromoCode = async (code: string): Promise<ValidationResult> => {
    // Handle special "GIFT" code for 14-day trial
    if (code.trim().toUpperCase() === "GIFT") {
        return { success: true, type: 'gift' };
    }

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
        return { success: false, error: "لا يمكن التحقق من رمز التفعيل. يرجى المحاولة مرة أخرى." };
    }
};

const TermsOfServiceDialog = () => (
    <Dialog>
        <DialogTrigger asChild>
            <Button variant="link" className="p-0 h-auto font-normal text-primary">شروط وأحكام الخدمة</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>شروط وأحكام الخدمة</DialogTitle>
                <DialogDescription>
                    آخر تحديث: {new Date().toLocaleDateString('ar-IQ')}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 text-sm text-muted-foreground">
                <p>مرحبًا بك في جيمكو. باستخدامك لخدماتنا، فإنك توافق على الالتزام بهذه الشروط. يرجى قراءتها بعناية.</p>
                
                <h4 className="font-bold text-foreground">1. الحسابات والاشتراكات</h4>
                <p>يجب أن يكون عمرك 18 عامًا على الأقل لإنشاء حساب. أنت مسؤول عن الحفاظ على سرية كلمة المرور الخاصة بك وعن جميع الأنشطة التي تحدث تحت حسابك.</p>

                <h4 className="font-bold text-foreground">2. سياسة الدفع والاسترداد</h4>
                <p>جميع المدفوعات للاشتراكات غير قابلة للاسترداد. بمجرد إتمام عملية الدفع وتفعيل الاشتراك، لا يمكن استرجاع المبلغ تحت أي ظرف من الظروف.</p>
                
                <h4 className="font-bold text-foreground">3. الخدمة والتعويض</h4>
                <p>نسعى لتقديم خدمة مستقرة وموثوقة. في حال حدوث خلل تقني كبير من جانبنا يؤثر بشكل جوهري على قدرتك على استخدام الخدمة، يحق لك المطالبة بتعويض مناسب. يتم تحديد طبيعة وقيمة التعويض (مثل تمديد فترة الاشتراك) حسب تقديرنا لكل حالة على حدة.</p>

                <h4 className="font-bold text-foreground">4. استخدام البيانات</h4>
                <p>أنت المسؤول الوحيد عن دقة وصحة البيانات التي تدخلها في النظام (بيانات الأعضاء، الاشتراكات، إلخ). نحن نستخدم هذه البيانات لتقديم الخدمة لك فقط ولا نشاركها مع أي طرف ثالث.</p>

                <h4 className="font-bold text-foreground">5. إنهاء الخدمة</h4>
                <p>نحتفظ بالحق في تعليق أو إنهاء حسابك في أي وقت إذا قمت بانتهاك هذه الشروط، دون أي إشعار مسبق أو استرداد للمبلغ المدفوع.</p>

                 <h4 className="font-bold text-foreground">6. تحديث الشروط</h4>
                <p>قد نقوم بتحديث هذه الشروط من وقت لآخر. سنقوم بإعلامك بأي تغييرات جوهرية. استمرارك في استخدام الخدمة بعد هذه التغييرات يعتبر موافقة منك على الشروط الجديدة.</p>
            </div>
        </DialogContent>
    </Dialog>
);

// Component
export function AuthForm({ initialTab = 'login' }: { initialTab?: 'login' | 'signup' }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [showOtp, setShowOtp] = React.useState(false);
  const [confirmationResult, setConfirmationResult] = React.useState<ConfirmationResult | null>(null);
  const [pendingSignupData, setPendingSignupData] = React.useState<z.infer<typeof signupSchema> | null>(null);

  // Forms
  const loginForm = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { identifier: "", password: "" }});
  const signupForm = useForm<z.infer<typeof signupSchema>>({ resolver: zodResolver(signupSchema), defaultValues: { identifier: "", password: "", promoCode: "", pricing: { dailyFitness: 0, weeklyFitness: 0, monthlyFitness: 0, dailyIron: 0, weeklyIron: 0, monthlyIron: 0 }, terms: false }});
  const otpForm = useForm<z.infer<typeof otpSchema>>({ resolver: zodResolver(otpSchema), defaultValues: { otp: "" }});


  // Recaptcha setup
  React.useEffect(() => {
    if (!(window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
    }
    return () => { 
        const verifier = (window as any).recaptchaVerifier;
        if (verifier) {
            verifier.clear(); 
        }
    }
  }, []);

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    setLoading(true);
    const { identifier, password } = values;

    if (isEmail(identifier)) {
      try {
        await signInWithEmailAndPassword(auth, identifier, password);
        toast({ title: "تم تسجيل الدخول بنجاح" });
        router.push("/dashboard");
      } catch (error) {
        toast({ variant: "destructive", title: "فشل الدخول", description: "البيانات التي أدخلتها غير صحيحة." });
      }
    } else if (isPhoneNumber(identifier)) {
      toast({ variant: "destructive", title: "فشل الدخول", description: "تسجيل الدخول برقم الهاتف يتطلب التحقق عبر رمز. يرجى التسجيل أولاً." });
    } else {
        toast({ variant: "destructive", title: "إدخال غير صالح", description: "الرجاء إدخال بريد إلكتروني أو رقم هاتف صحيح." });
    }
    setLoading(false);
  };
  
  const handleSignup = async (values: z.infer<typeof signupSchema>) => {
    setLoading(true);
    const { identifier, password } = values;

    if (isEmail(identifier)) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, identifier, password);
        await completeProfileCreation(userCredential.user.uid, values, 'email');
      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            toast({ variant: "destructive", title: "خطأ في التسجيل", description: "هذا البريد الإلكتروني مستخدم بالفعل." });
        } else {
            toast({ variant: "destructive", title: "خطأ في التسجيل", description: "حدث خطأ ما. يرجى المحاولة مرة أخرى." });
        }
      }
    } else if (isPhoneNumber(identifier)) {
        try {
            const recaptchaVerifier = (window as any).recaptchaVerifier;
            const confirmation = await signInWithPhoneNumber(auth, identifier, recaptchaVerifier);
            setConfirmationResult(confirmation);
            setPendingSignupData(values);
            setShowOtp(true);
            toast({ title: "تم إرسال الرمز", description: "تفقد هاتفك لاستلام رمز التحقق." });
        } catch (error) {
            toast({ variant: "destructive", title: "خطأ في إرسال الرمز", description: "لم نتمكن من إرسال الرمز. الرجاء التأكد من الرقم والمحاولة مرة أخرى." });
            console.error("SMS Sent Error:", error);
        }
    } else {
        toast({ variant: "destructive", title: "إدخال غير صالح", description: "الرجاء إدخال بريد إلكتروني أو رقم هاتف صحيح." });
    }
    setLoading(false);
  }

  const handleOtpSubmit = async (values: z.infer<typeof otpSchema>) => {
    if (!confirmationResult || !pendingSignupData) return;
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(values.otp);
      await completeProfileCreation(result.user.uid, pendingSignupData, 'phone');
    } catch (error) {
      toast({ variant: "destructive", title: "فشل التحقق", description: "رمز التحقق الذي أدخلته غير صحيح." });
      setShowOtp(false); // Hide OTP form on failure to allow retry
      setPendingSignupData(null);
    }
    setLoading(false);
  };
  
  const completeProfileCreation = async (uid: string, values: z.infer<typeof signupSchema>, authMethod: 'email' | 'phone') => {
    const { identifier, pricing, promoCode } = values;
    try {
        const validationResult = await validateAndUsePromoCode(promoCode);
        if (!validationResult.success) throw new Error(validationResult.error);

        const startDate = new Date();
        const endDate = new Date();
        if (validationResult.type === 'gift') endDate.setDate(startDate.getDate() + 14);
        else if (validationResult.type === 'monthly') endDate.setMonth(startDate.getMonth() + 1);
        else if (validationResult.type === '6-months') endDate.setMonth(startDate.getMonth() + 6);
        else endDate.setFullYear(startDate.getFullYear() + 1);

        const userData = {
            email: authMethod === 'email' ? identifier : null,
            phone: authMethod === 'phone' ? identifier : null,
            uid: uid,
            subscriptionType: validationResult.type,
            subscriptionStartDate: startDate,
            subscriptionEndDate: endDate,
            pricing: pricing,
            createdAt: serverTimestamp(),
            usedPromoCodes: [promoCode.trim().toUpperCase()] // Store used codes
        };

        await setDoc(doc(db, "gymOwners", uid), userData);
        toast({ title: "تم التسجيل بنجاح!", description: "تم إعداد حسابك وجاري التوجيه..." });
        router.push("/dashboard");

    } catch(error: any) {
        toast({ variant: "destructive", title: "فشل إكمال التسجيل", description: error.message || "حدث خطأ ما." });
        // Optional: Delete the created user if profile creation fails
        const user = auth.currentUser;
        if (user) await user.delete().catch(e => console.error("Failed to clean up user:", e));
    }
  };


  if (showOtp && pendingSignupData) {
    return (
       <Form {...otpForm}>
        <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-4 p-4">
            <h3 className="font-semibold text-lg text-center">التحقق من رقم الهاتف</h3>
            <p className="text-sm text-muted-foreground text-center">أدخل الرمز المكون من 6 أرقام الذي أرسلناه إلى {pendingSignupData.identifier}</p>
            <FormField control={otpForm.control} name="otp" render={({ field }) => (
              <FormItem>
                <FormLabel>رمز التحقق (OTP)</FormLabel>
                <FormControl><Input placeholder="123456" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" className="w-full" onClick={() => setShowOtp(false)}>إلغاء</Button>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  تحقق ومتابعة
                </Button>
            </div>
        </form>
      </Form>
    )
  }

  return (
    <>
    <Tabs defaultValue={initialTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
        <TabsTrigger value="signup">إنشاء حساب</TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <Form {...loginForm}>
          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4 p-4">
             <FormField control={loginForm.control} name="identifier" render={({ field }) => (
                <FormItem>
                  <FormLabel>البريد الإلكتروني أو رقم الهاتف</FormLabel>
                  <FormControl>
                    <div className="relative">
                        <Mail className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="e.g., mail@example.com or +964..." {...field} className="pr-8" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={loginForm.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>كلمة المرور</FormLabel>
                  <FormControl>
                     <div className="relative">
                        <Lock className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input type="password" placeholder="••••••••" {...field} className="pr-8" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full !mt-6" disabled={loading}>
                {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                تسجيل الدخول
              </Button>
          </form>
        </Form>
      </TabsContent>
      <TabsContent value="signup">
         <Form {...signupForm}>
            <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4 p-4 max-h-[70vh] overflow-y-auto">
                 <FormField control={signupForm.control} name="identifier" render={({ field }) => (
                    <FormItem>
                      <FormLabel>البريد الإلكتروني أو رقم الهاتف</FormLabel>
                      <FormControl>
                        <div className="relative">
                            <Mail className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="سيكون وسيلة الدخول لحسابك" {...field} className="pr-8"/>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                   <FormField control={signupForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>كلمة المرور</FormLabel>
                      <FormControl>
                        <div className="relative">
                            <Lock className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input type="password" placeholder="٨ أحرف على الأقل" {...field} className="pr-8" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={signupForm.control} name="promoCode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>رمز الاشتراك أو الهدية</FormLabel>
                      <FormControl><Input placeholder="أدخل الرمز (مثال: GIFT)" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-md font-medium text-center">أسعار الاشتراكات المبدئية</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-4 p-4 border rounded-lg">
                        <h4 className="font-medium text-center text-primary">أسعار اللياقة</h4>
                        <FormField control={signupForm.control} name="pricing.dailyFitness" render={({ field }) => (<FormItem><FormLabel>يومي</FormLabel><FormControl><div className="relative"><span className="absolute right-2.5 top-2.5 text-sm text-muted-foreground">د.ع</span><Input type="number" placeholder="0" className="pr-8" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={signupForm.control} name="pricing.weeklyFitness" render={({ field }) => (<FormItem><FormLabel>أسبوعي</FormLabel><FormControl><div className="relative"><span className="absolute right-2.5 top-2.5 text-sm text-muted-foreground">د.ع</span><Input type="number" placeholder="0" className="pr-8" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={signupForm.control} name="pricing.monthlyFitness" render={({ field }) => (<FormItem><FormLabel>شهري</FormLabel><FormControl><div className="relative"><span className="absolute right-2.5 top-2.5 text-sm text-muted-foreground">د.ع</span><Input type="number" placeholder="0" className="pr-8" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <div className="space-y-4 p-4 border rounded-lg">
                        <h4 className="font-medium text-center text-primary">أسعار الحديد</h4>
                        <FormField control={signupForm.control} name="pricing.dailyIron" render={({ field }) => (<FormItem><FormLabel>يومي</FormLabel><FormControl><div className="relative"><span className="absolute right-2.5 top-2.5 text-sm text-muted-foreground">د.ع</span><Input type="number" placeholder="0" className="pr-8" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={signupForm.control} name="pricing.weeklyIron" render={({ field }) => (<FormItem><FormLabel>أسبوعي</FormLabel><FormControl><div className="relative"><span className="absolute right-2.5 top-2.5 text-sm text-muted-foreground">د.ع</span><Input type="number" placeholder="0" className="pr-8" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={signupForm.control} name="pricing.monthlyIron" render={({ field }) => (<FormItem><FormLabel>شهري</FormLabel><FormControl><div className="relative"><span className="absolute right-2.5 top-2.5 text-sm text-muted-foreground">د.ع</span><Input type="number" placeholder="0" className="pr-8" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
                        </div>
                    </div>
                  </div>

                  <FormField
                    control={signupForm.control}
                    name="terms"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0 rounded-md border p-4 shadow-sm !mt-6">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel className="font-normal">أوافق على <TermsOfServiceDialog /></FormLabel>
                                <FormMessage />
                            </div>
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full !mt-6" disabled={loading || !signupForm.watch('terms')}>
                    {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    إنشاء حساب جديد
                </Button>
            </form>
         </Form>
      </TabsContent>
    </Tabs>
    <div id="recaptcha-container"></div>
    </>
  );
}

    