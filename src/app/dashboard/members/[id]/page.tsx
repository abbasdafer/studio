
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { User, Phone, Calendar, Dumbbell, Flame, Weight, Ruler, ChevronLeft, BrainCircuit, Loader2, Sparkles, Soup, Sandwich, Salad, Apple, ChevronDown, CheckCircle, Replace, Copy, Edit, Share2, Wallet, CreditCard, PiggyBank } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorDisplay } from '@/components/error-display';
import type { DocumentData } from 'firebase/firestore';
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { generateMealPlan, type MealPlanOutput, type MealPlanInput } from '@/ai/flows/meal-plan-flow';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

type MemberData = {
  id: string;
  name: string;
  phone?: string;
  subscriptionType: string;
  subscriptionPrice: number;
  amountPaid: number;
  debt: number;
  startDate: Date;
  endDate: Date;
  status: "Active" | "Expired";
  gymOwnerId: string;
  age?: number;
  weight?: number;
  height?: number;
  gender?: "male" | "female";
  dailyCalories?: number;
  mealPlan?: MealPlanOutput | null;
};

const editMemberSchema = z.object({
    name: z.string().min(1, { message: "اسم العضو مطلوب." }),
    phone: z.string().optional(),
    gender: z.enum(["male", "female"], { required_error: "يجب تحديد الجنس."}),
    age: z.coerce.number().min(10, "يجب أن يكون العمر 10 سنوات على الأقل.").max(100, "يجب أن يكون العمر أقل من 100 سنة."),
    weight: z.coerce.number().min(30, "يجب أن يكون الوزن 30 كجم على الأقل."),
    height: z.coerce.number().min(100, "يجب أن يكون الطول 100 سم على الأقل."),
});

const payDebtSchema = z.object({
    payment: z.coerce.number().positive("يجب أن يكون مبلغ الدفع أكبر من صفر."),
});


const calculateBMR = (gender: "male" | "female", weight: number, height: number, age: number): number => {
  // Mifflin-St Jeor Equation
  if (gender === "male") {
    return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  } else {
    return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  }
};


const translateSubscriptionType = (type: string): string => {
  if (!type) return type;
  const parts = type.split(" ");
  const period = parts[0];
  const classes = parts.slice(1).join(" ");

  const periodTranslations: Record<string, string> = {
    "Daily": "يومي",
    "Weekly": "أسبوعي",
    "Monthly": "شهري",
  };

  const classTranslations: Record<string, string> = {
    "Iron": "حديد",
    "Fitness": "لياقة",
    "Iron & Fitness": "حديد و لياقة",
    "Fitness & Iron": "حديد و لياقة"
  };
  
  const translatedPeriod = periodTranslations[period] || period;
  const translatedClasses = classTranslations[classes] || classes;

  return `${translatedPeriod} - ${translatedClasses}`;
};

const MealCard = ({ icon, title, meal, description, calories, alternatives }: { icon: React.ReactNode, title: string, meal: string, description: string, calories: number, alternatives: string }) => (
    <Card className="bg-background/50 flex flex-col">
        <CardHeader className="flex-row items-center gap-4 space-y-0 pb-4">
            <div className="bg-primary/10 p-3 rounded-full">
                {icon}
            </div>
            <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
            <p className="font-bold text-base">{meal}</p>
            <p className="text-sm text-muted-foreground mt-1 mb-3">{description}</p>
            <p className="text-sm font-semibold text-primary">{calories.toLocaleString()} سعر حراري</p>
        </CardContent>
         <CardContent className="pt-3 mt-auto">
            <div className="text-xs p-3 rounded-lg bg-muted/70">
                <p className="font-semibold flex items-center gap-1.5"><Replace className="h-3 w-3" /> بدائل مقترحة:</p>
                <p className="text-muted-foreground mt-1">{alternatives}</p>
            </div>
        </CardContent>
    </Card>
);

const InfoPill = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number | undefined }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        <div className="bg-primary/10 p-2.5 rounded-full">
            <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-semibold text-base">{value || 'غير مسجل'}</p>
        </div>
    </div>
);


export default function MemberProfilePage() {
  const { user } = useAuth();
  const params = useParams();
  const { toast } = useToast();
  const { id } = params;
  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isPayDebtDialogOpen, setPayDebtDialogOpen] = useState(false);
  const [mealPlan, setMealPlan] = useState<MealPlanOutput | null>(null);

  const editForm = useForm<z.infer<typeof editMemberSchema>>({
    resolver: zodResolver(editMemberSchema),
  });
  
  const payDebtForm = useForm<z.infer<typeof payDebtSchema>>({
    resolver: zodResolver(payDebtSchema),
  });

  useEffect(() => {
    if (!user || !id) return;

    const fetchMember = async () => {
      setLoading(true);
      setError(null);
      try {
        const memberId = Array.isArray(id) ? id[0] : id;
        const memberRef = doc(db, 'members', memberId);
        const memberDoc = await getDoc(memberRef);

        if (!memberDoc.exists()) {
          throw new Error('لم يتم العثور على العضو.');
        }
        
        const data = memberDoc.data() as DocumentData;

        // Security check: ensure the member belongs to the logged-in gym owner
        if (data.gymOwnerId !== user.uid) {
           throw new Error('ليس لديك صلاحية لعرض هذا العضو.');
        }
        
        const endDate = data.endDate.toDate();
        const memberData: MemberData = {
          id: memberDoc.id,
          name: data.name,
          phone: data.phone,
          subscriptionType: data.subscriptionType,
          subscriptionPrice: data.subscriptionPrice,
          amountPaid: data.amountPaid,
          startDate: data.startDate.toDate(),
          endDate: endDate,
          debt: (data.subscriptionPrice || 0) - (data.amountPaid || 0),
          status: new Date() > endDate ? 'Expired' : 'Active',
          gymOwnerId: data.gymOwnerId,
          age: data.age,
          weight: data.weight,
          height: data.height,
          gender: data.gender,
          dailyCalories: data.dailyCalories,
          mealPlan: data.mealPlan,
        };

        setMember(memberData);
        
        if(data.mealPlan) {
            setMealPlan(data.mealPlan);
        }
        editForm.reset({
            name: data.name,
            phone: data.phone,
            gender: data.gender,
            age: data.age,
            weight: data.weight,
            height: data.height,
        });

      } catch (e) {
        console.error('Error fetching member profile:', e);
        setError((e as Error).message || 'فشل في تحميل ملف العضو.');
      } finally {
        setLoading(false);
      }
    };

    fetchMember();
  }, [user, id, editForm]);

  const handleUpdateMember = async (values: z.infer<typeof editMemberSchema>) => {
    if (!member) return;

    const dailyCalories = calculateBMR(values.gender, values.weight, values.height, values.age);
    const updatedData = { ...values, dailyCalories };
    
    try {
        const memberRef = doc(db, 'members', member.id);
        await updateDoc(memberRef, updatedData);
        
        // Update local state to reflect changes instantly
        setMember(prev => prev ? { ...prev, ...updatedData } : null);
        
        toast({ title: "تم التحديث بنجاح", description: `تم تحديث بيانات ${values.name}.` });
        setEditDialogOpen(false);

    } catch (e) {
        console.error("Error updating member:", e);
        toast({ variant: "destructive", title: "فشل التحديث", description: "حدث خطأ أثناء تحديث بيانات العضو." });
    }
  };

  const handlePayDebt = async (values: z.infer<typeof payDebtSchema>) => {
    if (!member || member.debt <= 0) return;
    
    const paymentAmount = Math.min(values.payment, member.debt); // Can't pay more than the debt

    try {
      const memberRef = doc(db, 'members', member.id);
      await updateDoc(memberRef, {
        amountPaid: increment(paymentAmount)
      });
      
      const newAmountPaid = member.amountPaid + paymentAmount;
      const newDebt = member.subscriptionPrice - newAmountPaid;

      // Update local state
      setMember(prev => prev ? { ...prev, amountPaid: newAmountPaid, debt: newDebt } : null);
      
      toast({ title: "تم تسجيل الدفعة", description: `تم استلام ${paymentAmount.toLocaleString()} د.ع. الدين المتبقي: ${newDebt.toLocaleString()} د.ع.` });
      setPayDebtDialogOpen(false);
      payDebtForm.reset();

    } catch (e) {
      console.error("Error processing payment:", e);
      toast({ variant: "destructive", title: "فشل تسجيل الدفعة", description: "حدث خطأ ما." });
    }
  };

  const handleGeneratePlan = async (goal: MealPlanInput['goal']) => {
    if (!member?.dailyCalories) {
        toast({ variant: "destructive", title: "خطأ", description: "لا يمكن إنشاء خطة بدون تحديد السعرات الحرارية للعضو."});
        return;
    }
    setGeneratingPlan(true);
    setMealPlan(null);
    try {
        const plan = await generateMealPlan({ calories: member.dailyCalories, goal });
        setMealPlan(plan);
        // Save the generated plan to Firestore
        if(member) {
            const memberRef = doc(db, 'members', member.id);
            await updateDoc(memberRef, { mealPlan: plan });
            setMember(prev => prev ? { ...prev, mealPlan: plan } : null);
        }
    } catch (e) {
        console.error("Error generating meal plan:", e);
        toast({ variant: "destructive", title: "فشل إنشاء الخطة", description: "حدث خطأ أثناء التحدث مع الذكاء الاصطناعي. يرجى المحاولة مرة أخرى." });
    } finally {
        setGeneratingPlan(false);
    }
  };

  const handleCopyPlan = () => {
    if (!mealPlan) return;

    const formatMeal = (title: string, meal: { meal: string, description: string, calories: number, alternatives: string }) => {
        return `
--- ${title} ---
- الوجبة: ${meal.meal} (${meal.calories} سعر حراري)
- الوصف: ${meal.description}
- بدائل: ${meal.alternatives}
`;
    };
    
    const formatSnacks = (snacks: Array<{ meal: string, description: string, calories: number, alternatives: string }>) => {
        return snacks.map((snack, index) => formatMeal(`وجبة خفيفة ${index + 1}`, snack)).join('');
    };

    const planText = `
*${mealPlan.planTitle}*

${formatMeal('الفطور', mealPlan.breakfast)}
${formatMeal('الغداء', mealPlan.lunch)}
${formatMeal('العشاء', mealPlan.dinner)}
${mealPlan.snacks.length > 0 ? formatSnacks(mealPlan.snacks) : ''}
---
*إجمالي السعرات الحرارية: ${mealPlan.totalCalories.toLocaleString()} سعر حراري*
`;
    
    navigator.clipboard.writeText(planText.trim())
        .then(() => {
            toast({ title: "تم النسخ بنجاح", description: "تم نسخ الخطة الغذائية إلى الحافظة." });
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
            toast({ variant: "destructive", title: "فشل النسخ", description: "لم نتمكن من نسخ الخطة." });
        });
  };

  const handleShareProfile = () => {
    if (!member) return;
    const publicUrl = `${window.location.origin}/public/member/${member.id}`;
    navigator.clipboard.writeText(publicUrl)
        .then(() => {
            toast({ title: "تم نسخ الرابط", description: "يمكنك الآن مشاركة ملف العضو العام." });
        })
        .catch(err => {
            console.error('Failed to copy URL: ', err);
            toast({ variant: "destructive", title: "فشل النسخ", description: "لم نتمكن من نسخ الرابط." });
        });
  };

  if (loading) {
    return (
        <div className="container mx-auto max-w-5xl px-4 md:px-8 py-6 space-y-6">
            <Skeleton className="h-8 w-32" />
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-8 w-24" />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
    );
  }

  if (error) {
    return <div className="container mx-auto p-4 md:p-8"><ErrorDisplay title="خطأ" message={error} /></div>;
  }

  if (!member) {
    return null;
  }
  
  const planGoals = [
    { key: "bulking", label: "تضخيم وبناء عضل" },
    { key: "weightLoss", label: "خسارة وزن" },
    { key: "maintenance", label: "الحفاظ على الوزن" },
  ] as const;

  return (
    <div className="container mx-auto max-w-6xl px-4 md:px-8 py-6">
        <Button asChild variant="outline" size="sm" className="mb-6">
            <Link href="/dashboard">
                <ChevronLeft className="h-4 w-4 ml-1" />
                العودة إلى قائمة الأعضاء
            </Link>
        </Button>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{member.name}</h1>
                 <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon">
                            <Edit className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>تعديل بيانات {member.name}</DialogTitle>
                            <DialogDescription>
                                قم بتحديث معلومات المتدرب هنا. سيتم تحديث السعرات الحرارية تلقائياً.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...editForm}>
                            <form onSubmit={editForm.handleSubmit(handleUpdateMember)} className="space-y-4">
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={editForm.control} name="name" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الاسم الكامل</FormLabel>
                                            <FormControl><Input placeholder="الاسم الكامل للعضو" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={editForm.control} name="phone" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الهاتف (اختياري)</FormLabel>
                                            <FormControl><Input placeholder="+964..." {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <FormField control={editForm.control} name="gender" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الجنس</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger><SelectValue placeholder="اختر الجنس" /></SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="male">ذكر</SelectItem>
                                                        <SelectItem value="female">أنثى</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                     <FormField control={editForm.control} name="age" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>العمر</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                     <FormField control={editForm.control} name="weight" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الوزن (كجم)</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                     <FormField control={editForm.control} name="height" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الطول (سم)</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <DialogFooter className="pt-4">
                                    <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>إلغاء</Button>
                                    <Button type="submit" disabled={editForm.formState.isSubmitting}>
                                        {editForm.formState.isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                        حفظ التغييرات
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
                <Button variant="outline" size="icon" onClick={handleShareProfile}>
                    <Share2 className="h-4 w-4" />
                </Button>
            </div>
          <Badge variant={member.status === "Active" ? "default" : "destructive"} className={cn(member.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', 'hover:bg-opacity-80 text-base w-fit')}>
            {member.status === "Active" ? "الاشتراك فعال" : "الاشتراك منتهي"}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
                {/* Subscription Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>تفاصيل الاشتراك</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <InfoPill icon={Dumbbell} label="نوع الاشتراك" value={translateSubscriptionType(member.subscriptionType)} />
                        <InfoPill icon={Calendar} label="تاريخ البدء" value={format(member.startDate, "PPP", { locale: arSA })} />
                        <InfoPill icon={Calendar} label="تاريخ الانتهاء" value={format(member.endDate, "PPP", { locale: arSA })} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>الحالة المالية</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <InfoPill icon={CreditCard} label="سعر الاشتراك" value={`${member.subscriptionPrice.toLocaleString()} د.ع`} />
                         <InfoPill icon={PiggyBank} label="المبلغ المدفوع" value={`${member.amountPaid.toLocaleString()} د.ع`} />
                         <InfoPill icon={Wallet} label="الدين المتبقي" value={`${member.debt.toLocaleString()} د.ع`} />
                    </CardContent>
                    {member.debt > 0 && (
                        <CardFooter>
                            <Dialog open={isPayDebtDialogOpen} onOpenChange={setPayDebtDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="w-full">
                                        <Wallet className="ml-2 h-4 w-4" />
                                        تسجيل دفعة جديدة
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>تسجيل دفعة دين</DialogTitle>
                                        <DialogDescription>
                                            أدخل المبلغ الذي دفعه العضو الآن.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <Form {...payDebtForm}>
                                        <form onSubmit={payDebtForm.handleSubmit(handlePayDebt)} className="space-y-4">
                                            <FormField control={payDebtForm.control} name="payment" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>مبلغ الدفعة</FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <span className="absolute right-2.5 top-2.5 text-sm text-muted-foreground">د.ع</span>
                                                            <Input type="number" placeholder="0" className="pr-8" {...field} />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <DialogFooter className="pt-4">
                                                <Button type="button" variant="outline" onClick={() => setPayDebtDialogOpen(false)}>إلغاء</Button>
                                                <Button type="submit" disabled={payDebtForm.formState.isSubmitting}>
                                                    {payDebtForm.formState.isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                                    حفظ الدفعة
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        </CardFooter>
                    )}
                </Card>

                {/* Profile Info Card */}
                 <Card>
                    <CardHeader>
                        <CardTitle>البيانات الشخصية</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                         <InfoPill icon={Phone} label="رقم الهاتف" value={member.phone} />
                         <InfoPill icon={User} label="الجنس" value={member.gender === 'male' ? 'ذكر' : 'أنثى'} />
                         <InfoPill icon={Calendar} label="العمر" value={`${member.age} سنة`} />
                         <InfoPill icon={Weight} label="الوزن" value={`${member.weight} كجم`} />
                         <InfoPill icon={Ruler} label="الطول" value={`${member.height} سم`} />
                         <InfoPill icon={Flame} label="السعرات (BMR)" value={`${member.dailyCalories?.toLocaleString()} سعر حراري`} />
                    </CardContent>
                </Card>
            </div>

             {/* AI Meal Plan Card */}
            <Card className="lg:col-span-2">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                         <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                                <BrainCircuit className="h-6 w-6 text-primary" />
                                خطة غذائية بالذكاء الاصطناعي
                            </CardTitle>
                            <CardDescription className="mt-2">
                                اختر هدف المتدرب لإنشاء خطة غذائية عراقية مخصصة له.
                            </CardDescription>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button disabled={generatingPlan} className="w-full sm:w-auto">
                                    {generatingPlan ? (
                                        <>
                                            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                            جاري الإنشاء...
                                        </>
                                    ) : (
                                         <>
                                            <Sparkles className="ml-2 h-4 w-4" />
                                            إنشاء خطة جديدة
                                            <ChevronDown className="mr-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>اختر الهدف من الخطة</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {planGoals.map((goal) => (
                                    <DropdownMenuItem key={goal.key} onClick={() => handleGeneratePlan(goal.key as "bulking" | "weightLoss" | "maintenance")} disabled={generatingPlan}>
                                        {goal.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
                <CardContent>
                    {generatingPlan && (
                        <div className="space-y-4 pt-4">
                           <div className="text-center py-10 text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                                <p>الذكاء الاصطناعي يفكر...</p>
                                <p className="text-sm">قد يستغرق الأمر لحظات.</p>
                           </div>
                        </div>
                    )}
                    {mealPlan ? (
                        <div className="space-y-6 pt-6 border-t">
                            <h2 className="text-xl font-bold text-center text-primary">{mealPlan.planTitle}</h2>
                             <div className="grid md:grid-cols-2 gap-4">
                                <MealCard 
                                    icon={<Sandwich className="w-6 h-6 text-primary" />}
                                    title="الإفطار"
                                    meal={mealPlan.breakfast.meal}
                                    description={mealPlan.breakfast.description}
                                    calories={mealPlan.breakfast.calories}
                                    alternatives={mealPlan.breakfast.alternatives}
                                />
                                <MealCard 
                                    icon={<Soup className="w-6 h-6 text-primary" />}
                                    title="الغداء"
                                    meal={mealPlan.lunch.meal}
                                    description={mealPlan.lunch.description}
                                    calories={mealPlan.lunch.calories}
                                    alternatives={mealPlan.lunch.alternatives}
                                />
                                <MealCard 
                                    icon={<Salad className="w-6 h-6 text-primary" />}
                                    title="العشاء"
                                    meal={mealPlan.dinner.meal}
                                    description={mealPlan.dinner.description}
                                    calories={mealPlan.dinner.calories}
                                    alternatives={mealPlan.dinner.alternatives}
                                />
                                {mealPlan.snacks.map((snack, index) => (
                                    <MealCard 
                                        key={index}
                                        icon={<Apple className="w-6 h-6 text-primary" />}
                                        title={`وجبة خفيفة ${index + 1}`}
                                        meal={snack.meal}
                                        description={snack.description}
                                        calories={snack.calories}
                                        alternatives={snack.alternatives}
                                    />
                                ))}
                            </div>

                            <Separator className="my-6" />

                            <div className="flex flex-col sm:flex-row items-center justify-center text-center gap-4 p-4 bg-muted rounded-lg">
                                <div className='flex-1'>
                                    <p className="text-lg font-bold">إجمالي السعرات الحرارية المقترحة:</p>
                                    <p className="text-2xl font-bold text-primary">{mealPlan.totalCalories.toLocaleString()} سعر حراري</p>
                                </div>
                                <Button onClick={handleCopyPlan} variant="outline" className="w-full sm:w-auto">
                                    <Copy className="ml-2 h-4 w-4" />
                                    نسخ الخطة
                                </Button>
                            </div>
                        </div>
                    ) : (
                        !generatingPlan && (
                             <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-full">
                                <BrainCircuit className="h-12 w-12 mb-4 text-muted-foreground/50" />
                                <p>لم يتم إنشاء أي خطة بعد.</p>
                                <p className="text-sm">اختر هدفًا من القائمة أعلاه للبدء.</p>
                             </div>
                        )
                    )}
                 </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

