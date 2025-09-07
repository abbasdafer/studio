
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GymOwnerAccount } from "@/app/admin/users/page";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SubscriptionActions } from "./subscription-actions";

export function UsersTable({ users }: { users: GymOwnerAccount[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>إدارة المستخدمين</CardTitle>
        <CardDescription>عرض وتفعيل وإلغاء تفعيل حسابات أصحاب النوادي.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>معرف المستخدم</TableHead>
              <TableHead>تاريخ انتهاء الصلاحية</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead><span className="sr-only">الإجراءات</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell className="font-medium">{user.email || user.phone || "غير متوفر"}</TableCell>
                  <TableCell>{format(user.subscriptionEndDate, "PPP", { locale: arSA })}</TableCell>
                  <TableCell>
                    <Badge variant={user.status === "Active" ? "default" : "destructive"} className={cn(user.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', 'hover:bg-opacity-80')}>
                        {user.status === "Active" ? "فعال" : "منتهي"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <SubscriptionActions user={user} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  لا يوجد مستخدمون لعرضهم.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
