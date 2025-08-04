"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, where, Timestamp } from 'firebase/firestore';
import { DollarSign, Users, TrendingUp } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';

import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
  const parts = type.split(' ');
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].toLowerCase();
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

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const fetchData = async () => {
      setLoading(true);
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
                if (!data.startDate) {
                    return null;
                }
                const startDate = data.startDate instanceof Timestamp
                    ? data.startDate.toDate()
                    : new Date(data.startDate);

                return {
                    id: docSnap.id,
                    subscriptionType: data.subscriptionType || '',
                    startDate: startDate,
                };
            })
            .filter((member): member is Member => member !== null);

        const totalMembers = membersList.length;
        let totalRevenue = 0;
        const monthlyRevenue: { [key: string]: number } = {};

        membersList.forEach(member => {
          const priceKey = formatSubscriptionTypeToKey(member.subscriptionType);
          const price = pricing[priceKey] || 0;
          totalRevenue += price;

          if (member.startDate) {
            const month = member.startDate.toLocaleString('ar-SA', { month: 'short', year: 'numeric' });
            if (!monthlyRevenue[month]) {
              monthlyRevenue[month] = 0;
            }
            monthlyRevenue[month] += price;
          }
        });

        const averageRevenuePerMember = totalMembers > 0 ? totalRevenue / totalMembers : 0;
        
        const sortedMonthlyData = Object.entries(monthlyRevenue)
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => {
              const dateA = new Date(`01 ${a.name.replace(' ', ' ')}`);
              const dateB = new Date(`01 ${b.name.replace(' ', ' ')}`);
              return dateA.getTime() - dateB.getTime();
          });

        setStats({
          totalRevenue,
          totalMembers,
          averageRevenuePerMember,
          monthlyRevenue: sortedMonthlyData,
        });
      } catch (e) {
        console.error("خطأ في جلب البيانات أو معالجتها:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);
  
  if (loading) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-[300px]" />
        </div>
    );
  }

  if (!stats) {
    return <div className="text-center">لا توجد إحصائيات لعرضها.</div>
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
            <p className="text-xs text-muted-foreground">الإجمالي من جميع الأعضاء</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأعضاء</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">جميع الأعضاء النشطين والمنتهية عضويتهم</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط الإيرادات / عضو</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.averageRevenuePerMember.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">متوسط القيمة الدائمة</p>
          </CardContent>
        </Card>
      </div>
       <Card>
          <CardHeader>
            <CardTitle>نظرة عامة على الإيرادات الشهرية</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.monthlyRevenue}>
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
    </div>
  );
}
