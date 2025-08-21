
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, Phone, Calendar, Dumbbell, Flame, Weight, Ruler, BrainCircuit, Loader2, Soup, Sandwich, Salad, Apple, Replace } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorDisplay } from '@/components/error-display';
import type { DocumentData } from 'firebase/firestore';
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MealPlanOutput } from '@/ai/flows/meal-plan-flow';
import { Separator } from '@/components/ui/separator';

type MemberData = {
  id: string;
  name: string;
  subscriptionType: string;
  endDate: Date;
  status: "Active" | "Expired";
  mealPlan?: MealPlanOutput;
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
    <Card className="bg-card/50 flex flex-col">
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

export default function PublicMemberPage() {
  const params = useParams();
  const { id } = params;
  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
        setLoading(false);
        setError("معرّف العضو غير موجود.");
        return;
    };

    const fetchMember = async () => {
      setLoading(true);
      setError(null);
      try {
        const memberId = Array.isArray(id) ? id[0] : id;
        const memberRef = doc(db, 'members', memberId);
        const memberDoc = await getDoc(memberRef);

        if (!memberDoc.exists()) {
          throw new Error('لم يتم العثور على ملف العضو. قد يكون الرابط غير صحيح.');
        }
        
        const data = memberDoc.data() as DocumentData;
        const endDate = data.endDate.toDate();
        const status = new Date() > endDate ? 'Expired' : 'Active';

        const memberData: MemberData = {
          id: memberDoc.id,
          name: data.name,
          subscriptionType: data.subscriptionType,
          endDate: endDate,
          status: status,
          mealPlan: data.mealPlan || null,
        };

        setMember(memberData);

      } catch (e) {
        console.error('Error fetching public member profile:', e);
        setError((e as Error).message || 'فشل في تحميل ملف العضو.');
      } finally {
        setLoading(false);
      }
    };

    fetchMember();
  }, [id]);

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">جاري تحميل البيانات...</p>
            </div>
        </div>
    )
  }

  if (error) {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <ErrorDisplay title="خطأ في عرض الصفحة" message={error} />
        </div>
    );
  }

  if (!member) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 md:px-8 py-10">
        <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="text-3xl font-bold text-primary">{member.name}</CardTitle>
                        <CardDescription className="mt-1">
                            {translateSubscriptionType(member.subscriptionType)}
                        </CardDescription>
                    </div>
                     <Badge variant={member.status === "Active" ? "default" : "destructive"} className={cn(member.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', 'hover:bg-opacity-80 text-base w-fit text-center')}>
                        {member.status === "Active" ? `فعال حتى ${format(member.endDate, "PPP", { locale: arSA })}` : "الاشتراك منتهي"}
                    </Badge>
                </div>
            </CardHeader>
             <CardContent className="p-6">
                 {member.mealPlan ? (
                    <div className="space-y-8">
                        <div className="text-center">
                             <h2 className="text-2xl font-bold text-center text-primary">{member.mealPlan.planTitle}</h2>
                        </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <MealCard 
                                icon={<Sandwich className="w-6 h-6 text-primary" />}
                                title="الإفطار"
                                meal={member.mealPlan.breakfast.meal}
                                description={member.mealPlan.breakfast.description}
                                calories={member.mealPlan.breakfast.calories}
                                alternatives={member.mealPlan.breakfast.alternatives}
                            />
                            <MealCard 
                                icon={<Soup className="w-6 h-6 text-primary" />}
                                title="الغداء"
                                meal={member.mealPlan.lunch.meal}
                                description={member.mealPlan.lunch.description}
                                calories={member.mealPlan.lunch.calories}
                                alternatives={member.mealPlan.lunch.alternatives}
                            />
                            <MealCard 
                                icon={<Salad className="w-6 h-6 text-primary" />}
                                title="العشاء"
                                meal={member.mealPlan.dinner.meal}
                                description={member.mealPlan.dinner.description}
                                calories={member.mealPlan.dinner.calories}
                                alternatives={member.mealPlan.dinner.alternatives}
                            />
                            {member.mealPlan.snacks.map((snack, index) => (
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
                            <p className="text-2xl font-bold text-primary">{member.mealPlan.totalCalories.toLocaleString()} سعر حراري</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-16 text-muted-foreground flex flex-col items-center justify-center h-full">
                        <BrainCircuit className="h-16 w-16 mb-4 text-muted-foreground/30" />
                        <h3 className="text-xl font-semibold">لا توجد خطة غذائية</h3>
                        <p className="mt-2 text-base">لم يتم إنشاء خطة غذائية لهذا العضو حتى الآن.</p>
                        <p className="text-sm mt-1">اطلب من مدير النادي إنشاء واحدة لك.</p>
                    </div>
                )}
             </CardContent>
        </Card>
    </div>
  );
}

    