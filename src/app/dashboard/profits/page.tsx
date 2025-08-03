
"use client";

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, getDoc, query, where, Timestamp } from 'firebase/firestore';
import { BarChart, DollarSign, Users, TrendingUp, Loader2 } from 'lucide-react';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';

type Member = {
  id: string;
  subscriptionType: string;
  startDate: Date;
};

type Pricing = {
  [key: string]: number;
};

// This function converts "Monthly Fitness" to "monthlyFitness"
const formatSubscriptionTypeToKey = (type: string): string => {
  const parts = type.split(' ');
  if (parts.length < 2) return '';
  return parts[0].toLowerCase() + parts.slice(1).join('');
};

export default function ProfitsPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [pricing, setPricing] = useState<Pricing | null>(null);
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
          // Safe date handling
          let startDate = new Date(); // Default to now as a safe fallback
          if (data.startDate && typeof data.startDate.toDate === 'function') {
            startDate = data.startDate.toDate();
          }
          return {
            id: doc.id,
            subscriptionType: data.subscriptionType,
            startDate: startDate,
          };
        });
        setMembers(membersList);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const stats = useMemo(() => {
    if (!pricing || members.length === 0) {
      return {
        totalRevenue: 0,
        totalMembers: 0,
        averageRevenuePerMember: 0,
        monthlyRevenue: Array(12).fill(0).map((_, i) => ({ month: new Date(0, i).toLocaleString('default', { month: 'short' }), revenue: 0 })),
      };
    }

    const totalMembers = members.length;
    let totalRevenue = 0;

    const monthlyRevenueData = Array(12).fill(0).map((_, i) => ({ month: new Date(0, i).toLocaleString('default', { month: 'short' }), revenue: 0 }));

    members.forEach(member => {
      const priceKey = formatSubscriptionTypeToKey(member.subscriptionType);
      const price = pricing[priceKey] || 0;
      totalRevenue += price;

      const monthIndex = member.startDate.getMonth();
      if(monthlyRevenueData[monthIndex]){
        monthlyRevenueData[monthIndex].revenue += price;
      }
    });

    const averageRevenuePerMember = totalMembers > 0 ? totalRevenue / totalMembers : 0;

    return {
      totalRevenue,
      totalMembers,
      averageRevenuePerMember,
      monthlyRevenue: monthlyRevenueData,
    };
  }, [members, pricing]);
  
  if (loading) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-80" />
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total from all members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">All active & expired members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Revenue / Member</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.averageRevenuePerMember.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Average lifetime value</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ revenue: { label: "Revenue", color: "hsl(var(--primary))" } }} className="h-[300px] w-full">
            <ResponsiveContainer>
              <BarChart data={stats.monthlyRevenue}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickFormatter={(value) => `$${value}`}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
