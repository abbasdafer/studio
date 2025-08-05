"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, where, Timestamp } from 'firebase/firestore';
import { DollarSign, Users, TrendingUp } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { arSA } from "date-fns/locale";

import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorDisplay } from '@/components/error-display';

type Member = {
  id: string;
  subscriptionType: string;
  startDate: Date;
};

type Pricing = {
  [key: string]: number;
};

const formatSubscriptionTypeToKey = (type: string): string => {
  if (!type || typeof type !== 'string') return '';
  // Converts "Monthly Fitness" to "monthlyFitness"
  const parts = type.split(' ');
  if (parts.length < 2) return type.toLowerCase();
  return parts[0].toLowerCase() + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
};

export default function ProfitsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    totalRevenue: number;
    totalMembers: number;
    averageRevenuePerMember: number;
    monthlyRevenue: { name: string; total: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const ownerDocRef = doc(db, 'gymOwners', user.uid);
        const ownerDoc = await getDoc(ownerDocRef);
        if (!ownerDoc.exists()) {
          throw new Error("لم يتم العثور على بيانات مالك الصالة الرياضية.");
        }
        const pricing = ownerDoc.data().pricing as Pricing || {};

        const membersQuery = query(collection(db, 'members'), where('gymOwnerId', '==', user.uid));
        const membersSnapshot = await getDocs(membersQuery);
        const membersList: Member[] = membersSnapshot.docs
            .map(docSnap => {
                const data = docSnap.data();
                if (!data.startDate || !data.subscriptionType) {
                    return null;
                }
                const startDate = data.startDate instanceof Timestamp
                    ? data.startDate.toDate()
                    : new Date(data.startDate);

                return {
                    id: docSnap.id,
                    subscriptionType: data.subscriptionType,
                    startDate: startDate,
                };
            })
            .filter((member): member is Member => member !== null);

        let totalRevenue = 0;
        const monthlyRevenueData: { [key: string]: number } = {};

        membersList.forEach(member => {
          const priceKey = formatSubscriptionTypeToKey(member.subscriptionType);
          const price = pricing[priceKey] || 0;
          totalRevenue += price;

          if (member.startDate) {
            // Use a stable, sortable key like 'YYYY-MM'
            const monthKey = `${member.startDate.getFullYear()}-${(member.startDate.getMonth() + 1).toString().padStart(2, '0')}`;
            if (!monthlyRevenueData[monthKey]) {
              monthlyRevenueData[monthKey] = 0;
            }
            monthlyRevenueData[monthKey] += price;
          }
        });

        const totalMembers = membersList.length;
        const averageRevenuePerMember = totalMembers > 0 ? totalRevenue / totalMembers : 0;
        
        const sortedMonthlyData = Object.entries(monthlyRevenueData)
          .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
          .map(([key, total]) => {
              const [year, month] = key.split('-');
              const date = new Date(parseInt(year), parseInt(month) - 1);
              // Format to "Month Year" in Arabic
              const name = date.toLocaleString('ar-SA', { month: 'long', year: 'numeric', timeZone: 'UTC' });
              return { name, total };
          });
          
        setStats({
          totalRevenue,
          totalMembers,
          averageRevenuePerMember,
          monthlyRevenue: sortedMonthlyData,
        });
      } catch (e) {
        console.error("خطأ في جلب بيانات الأرباح:", e);
        setError((e as Error).message || 'حدث خطأ غير متوقع أثناء حساب الإحصائيات.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);
  
  if (loading) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-32 rounded-lg" />
                <Skeleton className="h-32 rounded-lg" />
                <Skeleton className="h-32 rounded-lg" />
            </div>
            <Skeleton className="h-[350px] rounded-lg" />
        </div>
    );
  }

  if (error) {
    return <ErrorDisplay title="فشل في عرض الإحصائيات" message={error} />
  }

  if (!stats || stats.totalMembers === 0) {
    return <div className="text-center py-10 text-muted-foreground">لا توجد إحصائيات لعرضها. قد لا يكون لديك أي أعضاء حتى الآن.</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">الإجمالي من جميع الاشتراكات المسجلة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأعضاء</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">العدد الكلي للأعضاء المسجلين</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط الإيرادات / عضو</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.averageRevenuePerMember.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">متوسط القيمة لكل عضو</p>
          </CardContent>
        </Card>
      </div>
       <Card>
          <CardHeader>
            <CardTitle>نظرة عامة على الإيرادات الشهرية</CardTitle>
            <CardDescription>
                عرض تفصيلي للإيرادات المحققة من اشتراكات الأعضاء كل شهر.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
            {stats.monthlyRevenue.length > 0 ? (
              <BarChart data={stats.monthlyRevenue}>
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  locale={arSA}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                    لا توجد بيانات كافية لعرض الرسم البياني.
                </div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
    </div>
  );
}
