"use client";

import { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, Users, CalendarDays } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartTooltipContent } from '@/components/ui/chart';

type SubscriptionType = 
  | "Daily Iron" | "Daily Fitness"
  | "Weekly Iron" | "Weekly Fitness"
  | "Monthly Iron" | "Monthly Fitness";

type Member = {
  subscriptionType: SubscriptionType;
  startDate: Date;
};

type Pricing = {
  dailyFitness: number;
  weeklyFitness: number;
  monthlyFitness: number;
  dailyIron: number;
  weeklyIron: number;
  monthlyIron: number;
};

type RevenueData = {
    name: string;
    total: number;
}

export default function ProfitsPage() {
  const { user } = useAuth();
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch pricing
        const ownerDocRef = doc(db, 'gymOwners', user.uid);
        const ownerDoc = await getDoc(ownerDocRef);
        if (ownerDoc.exists()) {
          setPricing(ownerDoc.data().pricing as Pricing);
        }

        // Fetch members
        const membersQuery = query(collection(db, 'members'), where('gymOwnerId', '==', user.uid));
        const membersSnapshot = await getDocs(membersQuery);
        const membersList = membersSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                subscriptionType: data.subscriptionType,
                startDate: data.startDate.toDate(),
            } as Member;
        });
        setMembers(membersList);
      } catch (error) {
        console.error("Error fetching profit data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const { totalRevenue, totalMembers, revenueByType, monthlyRevenue } = useMemo(() => {
    if (!pricing || members.length === 0) {
      return { totalRevenue: 0, totalMembers: 0, revenueByType: [], monthlyRevenue: [] };
    }

    const priceMap: Record<SubscriptionType, number> = {
      "Daily Fitness": pricing.dailyFitness,
      "Weekly Fitness": pricing.weeklyFitness,
      "Monthly Fitness": pricing.monthlyFitness,
      "Daily Iron": pricing.dailyIron,
      "Weekly Iron": pricing.weeklyIron,
      "Monthly Iron": pricing.monthlyIron,
    };
    
    let totalRevenue = 0;
    const revenueMap = new Map<string, number>();
    const monthlyRevenueMap = new Map<string, number>();

    for (const member of members) {
      const price = priceMap[member.subscriptionType] || 0;
      totalRevenue += price;
      
      const typeKey = member.subscriptionType.split(' ')[1]; // "Fitness" or "Iron"
      revenueMap.set(typeKey, (revenueMap.get(typeKey) || 0) + price);

      const monthYear = member.startDate.toLocaleString('default', { month: 'short' });
      monthlyRevenueMap.set(monthYear, (monthlyRevenueMap.get(monthYear) || 0) + price);
    }
    
    const revenueByType: RevenueData[] = Array.from(revenueMap.entries()).map(([name, total]) => ({ name, total }));

    const sortedMonths = Array.from(monthlyRevenueMap.entries()).sort((a,b) => {
        const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return monthOrder.indexOf(a[0]) - monthOrder.indexOf(b[0]);
    });
    const monthlyRevenue: RevenueData[] = sortedMonths.map(([name, total]) => ({ name, total }));

    return { totalRevenue, totalMembers: members.length, revenueByType, monthlyRevenue };
  }, [pricing, members]);
  
  if (loading) {
    return (
        <div className="space-y-6">
             <div className="space-y-2">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-5 w-1/2" />
            </div>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
        </div>
    )
  }

  return (
    <div className="space-y-6">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Profit Dashboard</h2>
            <p className="text-muted-foreground">
                An overview of your gym's financial performance.
            </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">From all subscriptions</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalMembers}</div>
                    <p className="text-xs text-muted-foreground">All-time member count</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Fitness Revenue</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${(revenueByType.find(r => r.name === 'Fitness')?.total || 0).toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">From Fitness packages</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Iron Revenue</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${(revenueByType.find(r => r.name === 'Iron')?.total || 0).toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">From Iron packages</p>
                </CardContent>
            </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
            <CardDescription>An overview of revenue generated each month.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyRevenue}>
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
                <Tooltip
                    cursor={{fill: 'hsl(var(--muted))'}}
                    content={<ChartTooltipContent
                        formatter={(value) => `$${Number(value).toFixed(2)}`}
                        labelKey='name'
                    />}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
    </div>
  );
}
