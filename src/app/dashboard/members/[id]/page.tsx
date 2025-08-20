
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { ArrowRight, User, Phone, Calendar, Dumbbell, Flame, Weight, Ruler, ChevronLeft } from 'lucide-react';
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


export default function MemberProfilePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        </div>
      </div>
    </div>
  );
}
