
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { ArrowRight, User, Phone, Calendar, Dumbbell, Flame, Weight, Ruler, ChevronLeft, BrainCircuit, Loader2, Sparkles, Soup, Sandwich, Salad, Apple } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorDisplay } from '@/components/error-display';
import type { DocumentData } from 'firebase/firestore';
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { generateMealPlan, type MealPlanOutput } from '@/ai/flows/meal-plan-flow';
import { useToast } from '@/hooks/use-toast';

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

const MealCard = ({ icon, title, meal, description, calories }: { icon: React.ReactNode, title: string, meal: string, description: string, calories: number }) => (
    <div className="flex items-start gap-4">
        <div className="bg-primary/10 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="font-bold text-base">{title}: <span className="font-normal">{meal}</span></p>
            <p className="text-sm text-muted-foreground">{description}</p>
            <p className="text-sm font-semibold text-primary">{calories} سعر حراري</p>
        </div>
    </div>
);


export default function MemberProfilePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
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

  const handleGeneratePlan = async () => {
    if (!member?.dailyCalories) {
        toast({ variant: "destructive", title: "خطأ", description: "لا يمكن إنشاء خطة بدون تحديد السعرات الحرارية للعضو."});
        return;
    }
    setGeneratingPlan(true);
    setMealPlan(null);
    try {
        const plan = await generateMealPlan({ calories: member.dailyCalories });
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
        <div className="container mx-auto p-4 md:p-8 space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Skeleton className="h-48 w-full" />
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

  const profileItems = [
      { icon: Phone, label: "رقم الهاتف", value: member.phone || "لم يسجل" },
      { icon: User, label: "الجنس", value: member.gender === 'male' ? 'ذكر' : 'أنثى' },
      { icon: Calendar, label: "العمر", value: `${member.age} سنة` },
      { icon: Weight, label: "الوزن", value: `${member.weight} كجم` },
      { icon: Ruler, label: "الطول", value: `${member.height} سم` },
      { icon: Flame, label: "السعرات اليومية (BMR)", value: `${member.dailyCalories} سعر حراري` },
  ]

  return (
    <div className="container mx-auto p-4 md:p-8">
        <Button asChild variant="outline" size="sm" className="mb-6">
            <Link href="/dashboard">
                <ChevronLeft className="h-4 w-4 ml-1" />
                العودة إلى قائمة الأعضاء
            </Link>
        </Button>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-3xl font-bold">{member.name}</h1>
          <Badge variant={member.status === "Active" ? "default" : "destructive"} className={cn(member.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', 'hover:bg-opacity-80 text-base w-fit')}>
            {member.status === "Active" ? "الاشتراك فعال" : "الاشتراك منتهي"}
          </Badge>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Subscription Card */}
            <Card className="lg:col-span-3">
                <CardHeader>
                    <CardTitle>تفاصيل الاشتراك</CardTitle>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <Dumbbell className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <p className="text-sm text-muted-foreground">نوع الاشتراك</p>
                        <p className="font-semibold">{translateSubscriptionType(member.subscriptionType)}</p>
                    </div>
                     <div className="p-4 bg-muted/50 rounded-lg">
                        <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <p className="text-sm text-muted-foreground">تاريخ البدء</p>
                        <p className="font-semibold">{format(member.startDate, "PPP", { locale: arSA })}</p>
                    </div>
                     <div className="p-4 bg-muted/50 rounded-lg">
                        <Calendar className="h-6 w-6 mx-auto mb-2 text-red-400" />
                        <p className="text-sm text-muted-foreground">تاريخ الانتهاء</p>
                        <p className="font-semibold">{format(member.endDate, "PPP", { locale: arSA })}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Profile Info Card */}
             <Card className="lg:col-span-3">
                <CardHeader>
                    <CardTitle>البيانات الشخصية والقياسات</CardTitle>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {profileItems.map(item => (
                        <div key={item.label} className="flex items-center gap-4">
                            <div className="bg-primary/10 p-3 rounded-full">
                                <item.icon className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{item.label}</p>
                                <p className="font-semibold text-lg">{item.value}</p>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

             {/* AI Meal Plan Card */}
            <Card className="lg:col-span-3">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                         <div>
                            <CardTitle className="flex items-center gap-2">
                                <BrainCircuit className="h-6 w-6 text-primary" />
                                خطة غذائية مقترحة بالذكاء الاصطناعي
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-2">
                                احصل على خطة غذائية مخصصة بناءً على السعرات الحرارية للمستخدم.
                            </p>
                        </div>
                        <Button onClick={handleGeneratePlan} disabled={generatingPlan}>
                            {generatingPlan ? (
                                <>
                                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                    جاري الإنشاء...
                                </>
                            ) : (
                                 <>
                                    <Sparkles className="ml-2 h-4 w-4" />
                                    إنشاء خطة جديدة
                                </>
                            )}
                        </Button>
                    </div>
                </CardHeader>
                {(generatingPlan || mealPlan) && (
                     <CardContent>
                        {generatingPlan && (
                            <div className="space-y-4">
                               <Skeleton className="h-16 w-full" />
                               <Skeleton className="h-16 w-full" />
                               <Skeleton className="h-16 w-full" />
                            </div>
                        )}
                        {mealPlan && (
                            <div className="space-y-6 pt-4 border-t">
                                 <MealCard 
                                    icon={<Sandwich className="w-6 h-6 text-primary" />}
                                    title="الإفطار"
                                    meal={mealPlan.breakfast.meal}
                                    description={mealPlan.breakfast.description}
                                    calories={mealPlan.breakfast.calories}
                                />
                                <MealCard 
                                    icon={<Soup className="w-6 h-6 text-primary" />}
                                    title="الغداء"
                                    meal={mealPlan.lunch.meal}
                                    description={mealPlan.lunch.description}
                                    calories={mealPlan.lunch.calories}
                                />
                                <MealCard 
                                    icon={<Salad className="w-6 h-6 text-primary" />}
                                    title="العشاء"
                                    meal={mealPlan.dinner.meal}
                                    description={mealPlan.dinner.description}
                                    calories={mealPlan.dinner.calories}
                                />
                                {mealPlan.snacks.map((snack, index) => (
                                    <MealCard 
                                        key={index}
                                        icon={<Apple className="w-6 h-6 text-primary" />}
                                        title={`وجبة خفيفة ${index + 1}`}
                                        meal={snack.meal}
                                        description={snack.description}
                                        calories={snack.calories}
                                    />
                                ))}

                                <div className="text-center pt-4 border-t mt-6">
                                    <p className="text-lg font-bold">إجمالي السعرات الحرارية المقترحة:</p>
                                    <p className="text-2xl font-bold text-primary">{mealPlan.totalCalories} سعر حراري</p>
                                </div>
                            </div>
                        )}
                     </CardContent>
                )}
            </Card>
        </div>
      </div>
    </div>
  );
}
