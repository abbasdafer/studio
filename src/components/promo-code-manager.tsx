"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, PlusCircle, Trash2 } from "lucide-react";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export type PromoCode = {
  id: string;
  code: string;
  type: "monthly" | "yearly";
  status: "active" | "used";
  uses: number;
  maxUses: number;
};

export function PromoCodeManager() {
  const { toast } = useToast();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [newCode, setNewCode] = useState({ code: "", type: "monthly" as "monthly" | "yearly", maxUses: "1" });
  const [loading, setLoading] = useState(true);

  const fetchPromoCodes = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "promoCodes"));
        const codesList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as PromoCode));
        setPromoCodes(codesList);
      } catch (error) {
        console.error("Error fetching promo codes: ", error);
        toast({ variant: 'destructive', title: 'خطأ في جلب الرموز', description: (error as Error).message });
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchPromoCodes();
  }, [toast]);

  const generateRandomCode = () => {
    const typePrefix = newCode.type === "monthly" ? "MONTHLY" : "YEARLY";
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    setNewCode(prev => ({...prev, code: `${typePrefix}${randomPart}`}));
  };
  
  const handleAddCode = async () => {
    const maxUsesNum = parseInt(newCode.maxUses, 10);
    if (!newCode.code || !newCode.type || isNaN(maxUsesNum) || maxUsesNum < 1) {
      toast({ variant: 'destructive', title: 'إدخال غير صالح', description: 'يرجى ملء جميع الحقول بشكل صحيح. يجب أن يكون الحد الأقصى للاستخدامات رقمًا أكبر من 0.' });
      return;
    }

    const newPromoData = {
      code: newCode.code,
      type: newCode.type,
      status: 'active' as const,
      uses: 0,
      maxUses: maxUsesNum,
    };

    try {
        const docRef = await addDoc(collection(db, "promoCodes"), newPromoData);
        const addedCode: PromoCode = { id: docRef.id, ...newPromoData };
        setPromoCodes(prev => [addedCode, ...prev]);

        toast({ title: 'نجاح', description: 'تم إنشاء رمز الاشتراك.' });
        setDialogOpen(false);
        setNewCode({ code: "", type: "monthly", maxUses: "1" });
    } catch (e) {
        console.error("Error adding document: ", e);
        toast({ variant: 'destructive', title: 'خطأ', description: (e as Error).message || 'لا يمكن إضافة رمز التفعيل.' });
    }
  };
  
  const handleDeleteCode = async (id: string) => {
    try {
        await deleteDoc(doc(db, "promoCodes", id));
        setPromoCodes(promoCodes.filter(c => c.id !== id));
        toast({ title: 'تم حذف رمز الاشتراك.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'لا يمكن حذف رمز الاشتراك.' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>أكواد الاشتراك</CardTitle>
                <CardDescription>
                إنشاء وإدارة أكواد الاشتراك لمديري الصالات الرياضية الجدد.
                </CardDescription>
            </div>
          <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  إضافة كود
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إنشاء رمز اشتراك جديد</DialogTitle>
                <DialogDescription>
                  قم بإنشاء رمز جديد لتقديمه لعميل جديد.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="code" className="text-right">الكود</Label>
                  <Input id="code" value={newCode.code} onChange={e => setNewCode({...newCode, code: e.target.value.trim()})} className="col-span-2" />
                  <Button variant="outline" size="sm" onClick={generateRandomCode}>عشوائي</Button>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">النوع</Label>
                  <Select value={newCode.type} onValueChange={v => setNewCode({...newCode, type: v as "monthly" | "yearly"})}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">اشتراك شهري</SelectItem>
                      <SelectItem value="yearly">اشتراك سنوي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="maxUses" className="text-right">أقصى استخدام</Label>
                  <Input id="maxUses" type="number" min="1" value={newCode.maxUses} onChange={e => setNewCode({...newCode, maxUses: e.target.value})} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setDialogOpen(false)} variant="outline">إلغاء</Button>
                <Button onClick={handleAddCode}>إنشاء كود</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
           <div className="space-y-4 p-4">
             <Skeleton className="h-12 w-full" />
             <Skeleton className="h-12 w-full" />
             <Skeleton className="h-12 w-full" />
           </div>
         ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الكود</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الاستخدام</TableHead>
              <TableHead>
                <span className="sr-only">الإجراءات</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {promoCodes.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                    لم يتم العثور على رموز ترويجية. قم بإنشاء واحد للبدء.
                    </TableCell>
                </TableRow>
                ) : (
                promoCodes.map((promo) => (
                <TableRow key={promo.id}>
                    <TableCell className="font-medium">{promo.code}</TableCell>
                    <TableCell>{promo.type === 'monthly' ? 'شهري' : 'سنوي'}</TableCell>
                    <TableCell>
                    <Badge variant={promo.uses >= promo.maxUses ? "secondary" : "default"} className={promo.uses >= promo.maxUses ? '' : 'bg-green-500/20 text-green-700 hover:bg-green-500/30'}>{promo.uses >= promo.maxUses ? 'مستخدم' : 'نشط'}</Badge>
                    </TableCell>
                    <TableCell>{promo.uses} / {promo.maxUses}</TableCell>
                    <TableCell>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">تبديل القائمة</span>
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => handleDeleteCode(promo.id)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                            <Trash2 className="ml-2 h-4 w-4" />
                            حذف
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>
                </TableRow>
                ))
            )}
          </TableBody>
        </Table>
         )}
      </CardContent>
    </Card>
  );
}
