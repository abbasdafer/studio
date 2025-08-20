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
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
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

const phoneLoginSchema = z.object({
    phone: z.string().min(10, { message: "الرجاء إدخال رقم هاتف صالح."}),
    otp: z.string().optional(),
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
  const [phoneLoading, setPhoneLoading] = React.useState(false);
  const [confirmationResult, setConfirmationResult] = React.useState<ConfirmationResult | null>(null);
  const [isOtpSent, setIsOtpSent] = React.useState(false);
  const [showPricing, setShowPricing] = React.useState(false);

  // Add a ref for the reCAPTCHA container
  const recaptchaContainerRef = React.useRef<HTMLDivElement>(null);


  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const phoneLoginForm = useForm<z.infer<typeof phoneLoginSchema>>({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: { phone: "", otp: "" },
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
  
  React.useEffect(() => {
    // Initialize reCAPTCHA verifier
    const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': (response: any) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      }
    });
    // Attach the verifier to the window object to be accessible
    (window as any).recaptchaVerifier = recaptchaVerifier;

    // Cleanup reCAPTCHA on unmount
    return () => {
       (window as any).recaptchaVerifier.clear();
    }
  }, []);


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

  const handlePhoneAuth = async (values: z.infer<typeof phoneLoginSchema>) => {
    setPhoneLoading(true);

    if (!isOtpSent) { // Step 1: Send OTP
        try {
            const recaptchaVerifier = (window as any).recaptchaVerifier;
            const confirmation = await signInWithPhoneNumber(auth, values.phone, recaptchaVerifier);
            setConfirmationResult(confirmation);
            setIsOtpSent(true);
            toast({ title: "تم إرسال الرمز", description: "تفقد هاتفك لاستلام رمز التحقق." });
        } catch (error) {
            console.error("SMS Sent Error:", error);
            toast({
                variant: "destructive",
                title: "خطأ في إرسال الرمز",
                description: "لم نتمكن من إرسال الرمز. الرجاء التأكد من الرقم والمحاولة مرة أخرى.",
            });
        } finally {
            setPhoneLoading(false);
        }
    } else { // Step 2: Verify OTP
        if (!confirmationResult || !values.otp) {
            toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال رمز التحقق." });
            setPhoneLoading(false);
            return;
        }
        try {
            const result = await confirmationResult.confirm(values.otp);
            const user = result.user;
            
            // Check if user is new or existing
            const userDoc = await getDoc(doc(db, "gymOwners", user.uid));
            if (userDoc.exists()) {
                toast({ title: "تم تسجيل الدخول بنجاح", description: "مرحباً بعودتك!" });
                router.push("/dashboard");
            } else {
                // New user: Show pricing and promo code form
                setShowPricing(true);
                toast({ title: "مرحباً بك!", description: "بما أن هذا هو تسجيل دخولك الأول، يرجى إكمال بيانات حسابك." });
            }

        } catch (error) {
            console.error("OTP Verification Error:", error);
            toast({
                variant: "destructive",
                title: "فشل التحقق",
                description: "رمز التحقق الذي أدخلته غير صحيح.",
            });
        } finally {
            setPhoneLoading(false);
        }
    }
  };
  
  const onFinalizePhoneSignUp = async (values: z.infer<typeof signUpSchema>) => {
      const user = auth.currentUser;
      if (!user) {
          toast({ variant: 'destructive', title: 'خطأ', description: 'انتهت جلسة المستخدم. الرجاء تسجيل الدخول مرة أخرى.'});
          return;
      }
      setLoading(true);
      try {
        const validationResult = await validateAndUsePromoCode(values.promoCode);
        if (!validationResult.success) {
            throw new Error(validationResult.error);
        }
        
        const startDate = new Date();
        const endDate = new Date();
        if (validationResult.type === 'monthly') {
            endDate.setMonth(startDate.getMonth() + 1);
        } else {
            endDate.setFullYear(startDate.getFullYear() + 1);
        }

        await setDoc(doc(db, "gymOwners", user.uid), {
            phone: user.phoneNumber, // Save phone number
            subscriptionType: validationResult.type,
            subscriptionStartDate: startDate,
            subscriptionEndDate: endDate,
            uid: user.uid,
            pricing: values.pricing,
        });

        toast({ title: "تم التسجيل بنجاح", description: "تم إعداد حسابك بنجاح." });
        router.push("/dashboard");

      } catch (error: any) {
        console.error("Phone sign up finalization failed:", error);
        toast({ variant: "destructive", title: "فشل إكمال التسجيل", description: error.message || "حدث خطأ ما." });
      } finally {
        setLoading(false);
      }
  }


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
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="login">دخول بالإيميل</TabsTrigger>
        <TabsTrigger value="phone-login">دخول بالهاتف</TabsTrigger>
        <TabsTrigger value="signup">إنشاء حساب</TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>تسجيل دخول مدير النادي</CardTitle>
            <CardDescription>
              أدخل بريدك الإلكتروني وكلمة المرور للوصول إلى لوحة التحكم.
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
      <TabsContent value="phone-login">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>الدخول أو التسجيل بالهاتف</CardTitle>
            <CardDescription>
              { !isOtpSent ? "أدخل رقم هاتفك لتلقي رمز التحقق." : "أدخل الرمز الذي وصلك عبر رسالة SMS." }
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[60vh] overflow-y-auto">
            {!showPricing ? (
                <Form {...phoneLoginForm}>
                    <form onSubmit={phoneLoginForm.handleSubmit(handlePhoneAuth)} className="space-y-4">
                        {!isOtpSent ? (
                            <FormField
                            control={phoneLoginForm.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>رقم الهاتف</FormLabel>
                                <FormControl>
                                    <Input placeholder="+9665xxxxxxxx" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        ) : (
                            <FormField
                            control={phoneLoginForm.control}
                            name="otp"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>رمز التحقق (OTP)</FormLabel>
                                <FormControl>
                                    <Input placeholder="123456" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        )}
                        <Button type="submit" className="w-full" disabled={phoneLoading}>
                            {phoneLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                            {isOtpSent ? 'تحقق وتسجيل الدخول' : 'إرسال الرمز'}
                        </Button>
                    </form>
                </Form>
            ) : (
                 <Form {...signUpForm}>
                    <form onSubmit={signUpForm.handleSubmit(onFinalizePhoneSignUp)} className="space-y-4">
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
                        <Separator />
                        {/* --- Pricing Fields --- */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <h3 className="text-lg font-medium">أسعار الاشتراكات</h3>
                                <p className="text-sm text-muted-foreground">حدد أسعار اشتراكات أعضائك.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Fitness Prices */}
                                <div className="space-y-4 p-4 border rounded-lg">
                                    <h4 className="font-medium text-center">أسعار اللياقة</h4>
                                    <FormField control={signUpForm.control} name="pricing.dailyFitness" render={({ field }) => (<FormItem><FormLabel>يومي</FormLabel><FormControl><div className="relative"><DollarSign className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="number" placeholder="0.00" className="pr-8" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={signUpForm.control} name="pricing.weeklyFitness" render={({ field }) => (<FormItem><FormLabel>أسبوعي</FormLabel><FormControl><div className="relative"><DollarSign className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="number" placeholder="0.00" className="pr-8" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={signUpForm.control} name="pricing.monthlyFitness" render={({ field }) => (<FormItem><FormLabel>شهري</FormLabel><FormControl><div className="relative"><DollarSign className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="number" placeholder="0.00" className="pr-8" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                {/* Iron Prices */}
                                <div className="space-y-4 p-4 border rounded-lg">
                                    <h4 className="font-medium text-center">أسعار الحديد</h4>
                                    <FormField control={signUpForm.control} name="pricing.dailyIron" render={({ field }) => (<FormItem><FormLabel>يومي</FormLabel><FormControl><div className="relative"><DollarSign className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="number" placeholder="0.00" className="pr-8" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={signUpForm.control} name="pricing.weeklyIron" render={({ field }) => (<FormItem><FormLabel>أسبوعي</FormLabel><FormControl><div className="relative"><DollarSign className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="number" placeholder="0.00" className="pr-8" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={signUpForm.control} name="pricing.monthlyIron" render={({ field }) => (<FormItem><FormLabel>شهري</FormLabel><FormControl><div className="relative"><DollarSign className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="number" placeholder="0.00" className="pr-8" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                            إكمال التسجيل
                        </Button>
                    </form>
                </Form>
            )}
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
      {/* This div is used by Firebase reCAPTCHA */}
      <div id="recaptcha-container" ref={recaptchaContainerRef}></div>
    </Tabs>
  );
}

    