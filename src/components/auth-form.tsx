"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { DollarSign, Loader2, Mail, Phone, ChevronRight } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { doc, setDoc, getDocs, collection, query, where, runTransaction, getDoc } from "firebase/firestore";

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
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import type { PromoCode } from "./promo-code-manager";
import { Separator } from "./ui/separator";

// Schemas
const identifierSchema = z.object({
  identifier: z.string().min(1, { message: "الرجاء إدخال بريد إلكتروني أو رقم هاتف." }),
});
const passwordSchema = z.object({
  password: z.string().min(8, { message: "يجب أن لا تقل كلمة المرور عن 8 أحرف." }),
});
const otpSchema = z.object({
  otp: z.string().min(6, { message: "الرجاء إدخال رمز التحقق المكون من 6 أرقام." }),
});
const profileSchema = z.object({
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

// Helper Functions
const isEmail = (text: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
const isPhoneNumber = (text: string) => /^\+?[1-9]\d{1,14}$/.test(text);

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
        return { success: false, error: "لا يمكن التحقق من رمز التفعيل. يرجى المحاولة مرة أخرى." };
    }
};

// Component
export function AuthForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [stage, setStage] = React.useState<"identifier" | "otp" | "password" | "profile">("identifier");
  const [authMethod, setAuthMethod] = React.useState<"email" | "phone" | null>(null);
  const [identifier, setIdentifier] = React.useState("");
  const [isExistingUser, setIsExistingUser] = React.useState(false);
  const [confirmationResult, setConfirmationResult] = React.useState<ConfirmationResult | null>(null);

  // Forms
  const identifierForm = useForm<z.infer<typeof identifierSchema>>({ resolver: zodResolver(identifierSchema), defaultValues: { identifier: "" }});
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema), defaultValues: { password: "" }});
  const otpForm = useForm<z.infer<typeof otpSchema>>({ resolver: zodResolver(otpSchema), defaultValues: { otp: "" }});
  const profileForm = useForm<z.infer<typeof profileSchema>>({ resolver: zodResolver(profileSchema), defaultValues: { promoCode: "", pricing: { dailyFitness: 0, weeklyFitness: 0, monthlyFitness: 0, dailyIron: 0, weeklyIron: 0, monthlyIron: 0 }}});

  // Recaptcha setup
  React.useEffect(() => {
    const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
    (window as any).recaptchaVerifier = recaptchaVerifier;
    return () => { (window as any).recaptchaVerifier.clear(); }
  }, []);

  // Handlers
  const handleIdentifierSubmit = async (values: z.infer<typeof identifierSchema>) => {
    setLoading(true);
    const currentIdentifier = values.identifier.trim();
    setIdentifier(currentIdentifier);

    if (isEmail(currentIdentifier)) {
      setAuthMethod("email");
      try {
        const methods = await fetchSignInMethodsForEmail(auth, currentIdentifier);
        setIsExistingUser(methods.length > 0);
        setStage("password");
      } catch (error) {
        toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ أثناء التحقق من البريد الإلكتروني." });
        console.error("Email check error:", error);
      }
    } else if (isPhoneNumber(currentIdentifier)) {
      setAuthMethod("phone");
      try {
        const userDoc = await getDocs(query(collection(db, "gymOwners"), where("phone", "==", currentIdentifier)));
        setIsExistingUser(!userDoc.empty);
        const recaptchaVerifier = (window as any).recaptchaVerifier;
        const confirmation = await signInWithPhoneNumber(auth, currentIdentifier, recaptchaVerifier);
        setConfirmationResult(confirmation);
        setStage("otp");
        toast({ title: "تم إرسال الرمز", description: "تفقد هاتفك لاستلام رمز التحقق." });
      } catch (error) {
        toast({ variant: "destructive", title: "خطأ في إرسال الرمز", description: "لم نتمكن من إرسال الرمز. الرجاء التأكد من الرقم والمحاولة مرة أخرى." });
        console.error("SMS Sent Error:", error);
      }
    } else {
      toast({ variant: "destructive", title: "إدخال غير صالح", description: "الرجاء إدخال بريد إلكتروني أو رقم هاتف صحيح." });
    }
    setLoading(false);
  };

  const handlePasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
    setLoading(true);
    try {
      if (isExistingUser) { // Login
        await signInWithEmailAndPassword(auth, identifier, values.password);
        toast({ title: "تم تسجيل الدخول بنجاح" });
        router.push("/dashboard");
      } else { // New user, move to profile completion
        // We store the password temporarily and create the user after profile completion
        setStage("profile");
      }
    } catch (error) {
      toast({ variant: "destructive", title: "فشل الدخول", description: "كلمة المرور غير صحيحة." });
      console.error("Password auth error:", error);
    }
    setLoading(false);
  };
  
  const handleOtpSubmit = async (values: z.infer<typeof otpSchema>) => {
    if (!confirmationResult) return;
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(values.otp);
      if (isExistingUser) {
        toast({ title: "تم تسجيل الدخول بنجاح" });
        router.push("/dashboard");
      } else {
        setStage("profile");
      }
    } catch (error) {
      toast({ variant: "destructive", title: "فشل التحقق", description: "رمز التحقق الذي أدخلته غير صحيح." });
      console.error("OTP verification error:", error);
    }
    setLoading(false);
  };

  const handleProfileSubmit = async (values: z.infer<typeof profileSchema>) => {
    setLoading(true);
    try {
      const validationResult = await validateAndUsePromoCode(values.promoCode);
      if (!validationResult.success) throw new Error(validationResult.error);

      let user = auth.currentUser;

      // If auth method was email, we need to create the user now
      if (authMethod === "email") {
        const password = passwordForm.getValues("password");
        const userCredential = await createUserWithEmailAndPassword(auth, identifier, password);
        user = userCredential.user;
      }
      
      if (!user) throw new Error("لم يتم العثور على المستخدم. الرجاء البدء من جديد.");

      const startDate = new Date();
      const endDate = new Date();
      if (validationResult.type === 'monthly') endDate.setMonth(startDate.getMonth() + 1);
      else endDate.setFullYear(startDate.getFullYear() + 1);
      
      const userData = {
        email: authMethod === 'email' ? user.email : null,
        phone: authMethod === 'phone' ? user.phoneNumber : null,
        subscriptionType: validationResult.type,
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
        uid: user.uid,
        pricing: values.pricing,
      };

      await setDoc(doc(db, "gymOwners", user.uid), userData);

      toast({ title: "تم التسجيل بنجاح", description: "تم إعداد حسابك." });
      router.push("/dashboard");
    } catch (error: any) {
      toast({ variant: "destructive", title: "فشل إكمال التسجيل", description: error.message || "حدث خطأ ما." });
      console.error("Profile submission error:", error);
    }
    setLoading(false);
  };

  const renderStage = () => {
    switch (stage) {
      case "identifier":
        return (
          <Form {...identifierForm}>
            <form onSubmit={identifierForm.handleSubmit(handleIdentifierSubmit)} className="space-y-4">
              <CardHeader>
                <CardTitle>تسجيل الدخول أو إنشاء حساب</CardTitle>
                <CardDescription>أدخل بريدك الإلكتروني أو رقم هاتفك للمتابعة.</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField control={identifierForm.control} name="identifier" render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني أو رقم الهاتف</FormLabel>
                    <FormControl><Input placeholder="e.g., mail@example.com or +9665..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full mt-6" disabled={loading}>
                  {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  متابعة
                </Button>
              </CardContent>
            </form>
          </Form>
        );
      case "password":
        return (
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
               <CardHeader>
                <CardTitle>{isExistingUser ? 'مرحباً بعودتك!' : 'إنشاء حساب جديد'}</CardTitle>
                <CardDescription>
                  {isExistingUser ? `تسجيل الدخول باستخدام ${identifier}` : `الرجاء إنشاء كلمة مرور لحسابك الجديد.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField control={passwordForm.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>كلمة المرور</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full mt-6" disabled={loading}>
                  {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  {isExistingUser ? 'تسجيل الدخول' : 'إنشاء حساب'}
                </Button>
              </CardContent>
            </form>
          </Form>
        );
      case "otp":
        return (
          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-4">
              <CardHeader>
                  <CardTitle>التحقق من رقم الهاتف</CardTitle>
                  <CardDescription>أدخل الرمز المكون من 6 أرقام الذي أرسلناه إلى {identifier}</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField control={otpForm.control} name="otp" render={({ field }) => (
                  <FormItem>
                    <FormLabel>رمز التحقق (OTP)</FormLabel>
                    <FormControl><Input placeholder="123456" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full mt-6" disabled={loading}>
                  {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  تحقق ومتابعة
                </Button>
              </CardContent>
            </form>
          </Form>
        );
      case "profile":
        return (
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
              <CardHeader>
                  <CardTitle>إكمال بيانات حسابك</CardTitle>
                  <CardDescription>مطلوب رمز اشتراك فعال وتحديد أسعارك للبدء.</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[60vh] overflow-y-auto space-y-6">
                <FormField control={profileForm.control} name="promoCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>رمز الاشتراك</FormLabel>
                    <FormControl><Input placeholder="أدخل الرمز الخاص بك" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">أسعار الاشتراكات</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-4 p-4 border rounded-lg">
                      <h4 className="font-medium text-center">أسعار اللياقة</h4>
                      <FormField control={profileForm.control} name="pricing.dailyFitness" render={({ field }) => (<FormItem><FormLabel>يومي</FormLabel><FormControl><div className="relative"><DollarSign className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="number" placeholder="0.00" className="pr-8" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={profileForm.control} name="pricing.weeklyFitness" render={({ field }) => (<FormItem><FormLabel>أسبوعي</FormLabel><FormControl><div className="relative"><DollarSign className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="number" placeholder="0.00" className="pr-8" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={profileForm.control} name="pricing.monthlyFitness" render={({ field }) => (<FormItem><FormLabel>شهري</FormLabel><FormControl><div className="relative"><DollarSign className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="number" placeholder="0.00" className="pr-8" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <div className="space-y-4 p-4 border rounded-lg">
                      <h4 className="font-medium text-center">أسعار الحديد</h4>
                      <FormField control={profileForm.control} name="pricing.dailyIron" render={({ field }) => (<FormItem><FormLabel>يومي</FormLabel><FormControl><div className="relative"><DollarSign className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="number" placeholder="0.00" className="pr-8" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={profileForm.control} name="pricing.weeklyIron" render={({ field }) => (<FormItem><FormLabel>أسبوعي</FormLabel><FormControl><div className="relative"><DollarSign className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="number" placeholder="0.00" className="pr-8" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={profileForm.control} name="pricing.monthlyIron" render={({ field }) => (<FormItem><FormLabel>شهري</FormLabel><FormControl><div className="relative"><DollarSign className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="number" placeholder="0.00" className="pr-8" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full !mt-6" disabled={loading}>
                  {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  إكمال التسجيل
                </Button>
              </CardContent>
            </form>
          </Form>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-full border-0 shadow-none">
      {renderStage()}
      <div id="recaptcha-container"></div>
    </Card>
  );
}
