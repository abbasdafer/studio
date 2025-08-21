
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { User, Phone, Calendar, Dumbbell, Flame, Weight, Ruler, ChevronLeft, BrainCircuit, Loader2, Sparkles, Soup, Sandwich, Salad, Apple, ChevronDown, CheckCircle, Replace } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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


type MemberData = {
  id: string;
  name: string;
  phone?: string;
  subscriptionType: string;
  startDate: Date;
  endDate: Date;
  status: "Active" | "Expired";
  gymOwnerId: string;
  age?: number;
  weight?: number;
  height?: number;
  gender?: "male" | "female";
  dailyCalories?: number;
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
  const [mealPlan, setMealPlan] = useState<MealPlanOutput | null>(null);


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
        const status = new Date() > endDate ? 'Expired' : 'Active';

        setMember({
          id: memberDoc.id,
          ...data,
          startDate: data.startDate.toDate(),
          endDate: endDate,
          status: status,
        } as MemberData);

      } catch (e) {
        console.error('Error fetching member profile:', e);
        setError((e as Error).message || 'فشل في تحميل ملف العضو.');
      } finally {
        setLoading(false);
      }
    };

    fetchMember();
  }, [user, id]);

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
    } catch (e) {
        console.error("Error generating meal plan:", e);
        toast({ variant: "destructive", title: "فشل إنشاء الخطة", description: "حدث خطأ أثناء التحدث مع الذكاء الاصطناعي. يرجى المحاولة مرة أخرى." });
    } finally {
        setGeneratingPlan(false);
    }
  }


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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-3xl font-bold">{member.name}</h1>
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
                         <InfoPill icon={Flame} label="السعرات (BMR)" value={`${member.dailyCalories} سعر حراري`} />
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
                                    <DropdownMenuItem key={goal.key} onClick={() => handleGeneratePlan(goal.key)} disabled={generatingPlan}>
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

                            <div className="text-center p-4 bg-muted rounded-lg">
                                <p className="text-lg font-bold">إجمالي السعرات الحرارية المقترحة:</p>
                                <p className="text-2xl font-bold text-primary">{mealPlan.totalCalories.toLocaleString()} سعر حراري</p>
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

