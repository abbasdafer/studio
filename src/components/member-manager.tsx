"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MoreHorizontal, PlusCircle, Trash2, CalendarIcon, User, Search, RefreshCw, MessageSquare, Phone, Flame } from "lucide-react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";


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
  DropdownMenuSeparator,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";
import { ErrorDisplay } from "./error-display";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Checkbox } from "./ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "./ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";


type SubscriptionPeriod = "Daily" | "Weekly" | "Monthly";
type SubscriptionClass = "Iron" | "Fitness";
type SubscriptionType = string; // e.g., "Daily Iron", "Weekly Fitness", "Monthly Iron & Fitness"

type Member = {
  id: string;
  name: string;
  phone?: string;
  subscriptionType: SubscriptionType;
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

const memberSchema = z.object({
    name: z.string().min(1, { message: "اسم العضو مطلوب." }),
    phone: z.string().optional(),
    period: z.enum(["Daily", "Weekly", "Monthly"], {
        required_error: "يجب اختيار فترة زمنية.",
    }),
    classes: z.array(z.string()).refine((value) => value.some((item) => item), {
        message: "يجب اختيار نوع تمرين واحد على الأقل.",
    }),
    gender: z.enum(["male", "female"], { required_error: "يجب تحديد الجنس."}),
    age: z.coerce.number().min(10, "يجب أن يكون العمر 10 سنوات على الأقل.").max(100, "يجب أن يكون العمر أقل من 100 سنة."),
    weight: z.coerce.number().min(30, "يجب أن يكون الوزن 30 كجم على الأقل."),
    height: z.coerce.number().min(100, "يجب أن يكون الطول 100 سم على الأقل."),
});

const renewSchema = z.object({
     period: z.enum(["Daily", "Weekly", "Monthly"], {
        required_error: "يجب اختيار فترة زمنية.",
    }),
    classes: z.array(z.string()).refine((value) => value.some((item) => item), {
        message: "يجب اختيار نوع تمرين واحد على الأقل.",
    }),
});

const calculateBMR = (gender: "male" | "female", weight: number, height: number, age: number): number => {
  // Mifflin-St Jeor Equation
  if (gender === "male") {
    return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  } else {
    return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  }
};


const calculateEndDate = (startDate: Date, type: SubscriptionType): Date => {
  const date = new Date(startDate);
  const [duration, _] = type.split(" ");
  
  if (duration === "Daily") {
    date.setDate(date.getDate() + 1);
  } else if (duration === "Weekly") {
    date.setDate(date.getDate() + 7);
  } else if (duration === "Monthly") {
    date.setMonth(date.getMonth() + 1);
  }
  return date;
};

const formatSubscriptionType = (period: SubscriptionPeriod, classes: SubscriptionClass[]): SubscriptionType => {
    const classString = classes.sort().join(" & ");
    return `${period} ${classString}`;
}

const translateSubscriptionType = (type: SubscriptionType): string => {
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

export function MemberManager({ gymOwnerId }: { gymOwnerId: string }) {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isRenewDialogOpen, setRenewDialogOpen] = useState(false);
  const [renewalMember, setRenewalMember] = useState<Member | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const addForm = useForm<z.infer<typeof memberSchema>>({
    resolver: zodResolver(memberSchema),
    defaultValues: { name: "", phone: "", period: "Monthly", classes: ["Iron"], age: 18, weight: 70, height: 170 },
  });

  const renewForm = useForm<z.infer<typeof renewSchema>>({
    resolver: zodResolver(renewSchema),
    defaultValues: { period: "Monthly", classes: ["Iron"] },
  });


  useEffect(() => {
    const fetchMembers = async () => {
      if (!gymOwnerId) return;
      setLoading(true);
      setError(null);
      try {
        const q = query(collection(db, "members"), where("gymOwnerId", "==", gymOwnerId));
        const querySnapshot = await getDocs(q);
        const membersList = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const endDate = data.endDate.toDate();
            const status = new Date() > endDate ? 'Expired' : 'Active';
            return {
                id: doc.id,
                ...data,
                startDate: data.startDate.toDate(),
                endDate: endDate,
                status: status,
            } as Member
        }).sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
        setMembers(membersList);
      } catch (e) {
        console.error("Error fetching members: ", e);
        setError((e as Error).message || "فشل في جلب الأعضاء من قاعدة البيانات.");
        toast({ variant: 'destructive', title: 'خطأ في جلب البيانات', description: 'يرجى التحقق من اتصالك بالإنترنت.' });
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [gymOwnerId, toast]);

  const handleAddMember = async (values: z.infer<typeof memberSchema>) => {
    const subscriptionType = formatSubscriptionType(values.period as SubscriptionPeriod, values.classes as SubscriptionClass[]);
    const startDate = new Date();
    const endDate = calculateEndDate(startDate, subscriptionType);
    const dailyCalories = calculateBMR(values.gender, values.weight, values.height, values.age);

    const newMemberData = {
      name: values.name,
      phone: values.phone || "",
      subscriptionType,
      startDate,
      endDate,
      status: 'Active' as 'Active' | 'Expired',
      gymOwnerId,
      gender: values.gender,
      age: values.age,
      weight: values.weight,
      height: values.height,
      dailyCalories: dailyCalories
    };

    try {
        const docRef = await addDoc(collection(db, "members"), newMemberData);
        const addedMember: Member = { id: docRef.id, ...newMemberData };
        setMembers(prev => [addedMember, ...prev].sort((a, b) => b.startDate.getTime() - a.startDate.getTime()));
        toast({ title: 'نجاح', description: `تمت إضافة عضو جديد. السعرات الحرارية المحسوبة: ${dailyCalories}` });
        setAddDialogOpen(false);
        addForm.reset();
    } catch (e) {
        console.error("Error adding document: ", e);
        toast({ variant: 'destructive', title: 'خطأ', description: 'لا يمكن إضافة العضو.' });
    }
  };
  
  const handleDeleteMember = async (id: string) => {
    try {
        await deleteDoc(doc(db, "members", id));
        setMembers(members.filter(m => m.id !== id));
        toast({ title: 'تم حذف العضو.' });
    } catch (e) {
        console.error("Error deleting member: ", e);
        toast({ variant: 'destructive', title: 'خطأ', description: 'لا يمكن حذف العضو.' });
    }
  };

  const handleRenewSubscription = async (values: z.infer<typeof renewSchema>) => {
    if (!renewalMember) return;
    
    const subscriptionType = formatSubscriptionType(values.period as SubscriptionPeriod, values.classes as SubscriptionClass[]);
    const startDate = new Date();
    const endDate = calculateEndDate(startDate, subscriptionType);
    
    try {
        const memberRef = doc(db, "members", renewalMember.id);
        await updateDoc(memberRef, {
            subscriptionType,
            startDate,
            endDate,
            status: 'Active'
        });

        setMembers(prevMembers => prevMembers.map(m => 
            m.id === renewalMember.id 
            ? { ...m, subscriptionType, startDate, endDate, status: 'Active' }
            : m
        ).sort((a, b) => b.startDate.getTime() - a.startDate.getTime()));

        toast({ title: 'نجاح', description: `تم تجديد اشتراك ${renewalMember.name}.` });
        setRenewDialogOpen(false);
        setRenewalMember(null);
    } catch (e) {
        console.error("Error renewing subscription: ", e);
        toast({ variant: 'destructive', title: 'خطأ', description: 'لا يمكن تجديد الاشتراك.' });
    }
  };

  const handleSendWhatsAppReminder = (member: Member) => {
    if (!member.phone) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'لا يوجد رقم هاتف لهذا العضو.' });
      return;
    }
    const message = `مرحباً ${member.name}، نود تذكيرك بأن اشتراكك في النادي قد انتهى. نتمنى رؤيتك قريباً!`;
    const whatsappUrl = `https://wa.me/${member.phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const openRenewDialog = (member: Member) => {
    setRenewalMember(member);
    renewForm.reset({
        period: "Monthly",
        classes: ["Iron"],
    });
    setRenewDialogOpen(true);
  };
  
  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                  <CardTitle>إدارة الأعضاء</CardTitle>
                  <CardDescription>
                  إضافة وعرض وبحث وإدارة أعضاء النادي.
                  </CardDescription>
              </div>
            <div className="flex w-full sm:w-auto items-center gap-2">
                 <div className="relative w-full sm:w-auto">
                    <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="ابحث بالاسم..."
                        className="pr-8 w-full sm:w-[200px] lg:w-[250px]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                    <Button size="sm" className="gap-1">
                        <PlusCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">إضافة عضو</span>
                    </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>إضافة عضو جديد</DialogTitle>
                        <DialogDescription>
                         أدخل تفاصيل العضو الجديد. سيتم حساب السعرات الحرارية تلقائياً.
                        </DialogDescription>
                    </DialogHeader>
                     <Form {...addForm}>
                        <form onSubmit={addForm.handleSubmit(handleAddMember)} className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-primary">المعلومات الشخصية</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={addForm.control} name="name" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الاسم الكامل</FormLabel>
                                            <FormControl><Input placeholder="الاسم الكامل للعضو" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={addForm.control} name="phone" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الهاتف (اختياري)</FormLabel>
                                            <FormControl><Input placeholder="+9665xxxxxxxx" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-primary">القياسات الجسدية</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <FormField control={addForm.control} name="gender" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الجنس</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger><SelectValue placeholder="اختر الجنس" /></SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="male">ذكر</SelectItem>
                                                        <SelectItem value="female">أنثى</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                     <FormField control={addForm.control} name="age" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>العمر</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                     <FormField control={addForm.control} name="weight" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الوزن (كجم)</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                     <FormField control={addForm.control} name="height" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الطول (سم)</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-primary">تفاصيل الاشتراك</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={addForm.control} name="period" render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>الفترة الزمنية</FormLabel>
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                                    <FormItem className="flex items-center space-x-3 space-x-reverse"><FormControl><RadioGroupItem value="Daily" /></FormControl><FormLabel className="font-normal">يومي</FormLabel></FormItem>
                                                    <FormItem className="flex items-center space-x-3 space-x-reverse"><FormControl><RadioGroupItem value="Weekly" /></FormControl><FormLabel className="font-normal">أسبوعي</FormLabel></FormItem>
                                                    <FormItem className="flex items-center space-x-3 space-x-reverse"><FormControl><RadioGroupItem value="Monthly" /></FormControl><FormLabel className="font-normal">شهري</FormLabel></FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={addForm.control} name="classes" render={({ field }) => (
                                        <FormItem>
                                             <div className="mb-4">
                                                <FormLabel>نوع التمرين</FormLabel>
                                            </div>
                                            {[{id: "Iron", label: "حديد"}, {id: "Fitness", label: "لياقة"}].map((item) => (
                                                <FormField key={item.id} control={addForm.control} name="classes" render={({ field }) => {
                                                    return (
                                                        <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-x-reverse">
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value?.includes(item.id)}
                                                                    onCheckedChange={(checked) => {
                                                                        return checked
                                                                        ? field.onChange([...(field.value || []), item.id])
                                                                        : field.onChange(field.value?.filter((value) => value !== item.id))
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <FormLabel className="font-normal">{item.label}</FormLabel>
                                                        </FormItem>
                                                    )
                                                }} />
                                            ))}
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>
                            <DialogFooter className="pt-6">
                                <Button type="button" onClick={() => setAddDialogOpen(false)} variant="outline">إلغاء</Button>
                                <Button type="submit" disabled={addForm.formState.isSubmitting}>إضافة عضو</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                    </DialogContent>
                </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
            </div>
          ) : error ? (
             <ErrorDisplay title="حدث خطأ في عرض الأعضاء" message={error} />
          ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><User className="inline-block ml-2 h-4 w-4" />الاسم</TableHead>
                    <TableHead><Phone className="inline-block ml-2 h-4 w-4" />الهاتف</TableHead>
                    <TableHead>الاشتراك</TableHead>
                    <TableHead><CalendarIcon className="inline-block ml-2 h-4 w-4" />تاريخ الانتهاء</TableHead>
                    <TableHead>الحالة</TableHead>
                     <TableHead><Flame className="inline-block ml-2 h-4 w-4" />السعرات (BMR)</TableHead>
                    <TableHead>
                      <span className="sr-only">الإجراءات</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        {searchQuery ? 'لا يوجد أعضاء يطابقون بحثك.' : 'لا يوجد أعضاء بعد. انقر على "إضافة عضو" للبدء.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/members/${member.id}`} className="hover:underline text-primary">
                          {member.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {member.phone ? (
                          <span className="text-muted-foreground" dir="ltr">{member.phone}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">لا يوجد</span>
                        )}
                      </TableCell>
                      <TableCell>{translateSubscriptionType(member.subscriptionType)}</TableCell>
                      <TableCell>{format(member.endDate, "PPP", { locale: arSA })}</TableCell>
                      <TableCell>
                        <Badge variant={member.status === "Active" ? "default" : "destructive"} className={cn(member.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', 'hover:bg-opacity-80')}>{member.status === "Active" ? "فعال" : "منتهي"}</Badge>
                      </TableCell>
                       <TableCell>{member.dailyCalories || 'N/A'}</TableCell>
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
                            <DropdownMenuItem onSelect={() => openRenewDialog(member)}>
                               <RefreshCw className="ml-2 h-4 w-4" />
                               تجديد الاشتراك
                            </DropdownMenuItem>
                            {member.status === 'Expired' && member.phone && (
                              <DropdownMenuItem onSelect={() => handleSendWhatsAppReminder(member)}>
                                <MessageSquare className="ml-2 h-4 w-4" />
                                إرسال تذكير
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => handleDeleteMember(member.id)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
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
            </div>
            
            {/* Mobile Card List */}
            <div className="md:hidden space-y-4">
              {filteredMembers.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    {searchQuery ? 'لا يوجد أعضاء يطابقون بحثك.' : 'لا يوجد أعضاء بعد. انقر على "إضافة عضو" للبدء.'}
                </div>
              ) : (
                 filteredMembers.map((member) => (
                   <Card key={member.id} className="relative">
                      <CardContent className="p-4 space-y-3">
                         <div className="flex items-center justify-between">
                            <Link href={`/dashboard/members/${member.id}`} className="font-bold text-lg hover:underline text-primary">
                                {member.name}
                            </Link>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8 absolute top-2 left-2">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">تبديل القائمة</span>
                                    </Button>
                                </DropdownMenuTrigger>
                               <DropdownMenuContent align="end">
                                <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => openRenewDialog(member)}>
                                   <RefreshCw className="ml-2 h-4 w-4" />
                                   تجديد الاشتراك
                                </DropdownMenuItem>
                                {member.status === 'Expired' && member.phone && (
                                  <DropdownMenuItem onSelect={() => handleSendWhatsAppReminder(member)}>
                                    <MessageSquare className="ml-2 h-4 w-4" />
                                    إرسال تذكير
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => handleDeleteMember(member.id)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                  <Trash2 className="ml-2 h-4 w-4" />
                                  حذف
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                         </div>
                         
                         <Badge variant={member.status === "Active" ? "default" : "destructive"} className={cn(member.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', 'hover:bg-opacity-80 text-xs w-fit')}>{member.status === "Active" ? "فعال" : "منتهي"}</Badge>
                        
                         <div className="text-sm text-muted-foreground space-y-2">
                           {member.phone && (
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span dir="ltr">{member.phone}</span>
                            </div>
                           )}
                           <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>{translateSubscriptionType(member.subscriptionType)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4" />
                                <span>ينتهي في: {format(member.endDate, "PPP", { locale: arSA })}</span>
                            </div>
                             <div className="flex items-center gap-2">
                                <Flame className="h-4 w-4" />
                                <span>السعرات: {member.dailyCalories || 'N/A'}</span>
                            </div>
                         </div>
                         
                      </CardContent>
                   </Card>
                 ))
              )}
            </div>
          </>
          )}
        </CardContent>
      </Card>
      
      {/* Renewal Dialog */}
      <Dialog open={isRenewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تجديد اشتراك {renewalMember?.name}</DialogTitle>
            <DialogDescription>
              اختر نوع الاشتراك الجديد لتجديد العضوية. سيتم تعيين تاريخ البدء إلى اليوم.
            </DialogDescription>
          </DialogHeader>
           <form onSubmit={renewForm.handleSubmit(handleRenewSubscription)}>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="space-y-2">
                             <Label>الفترة الزمنية</Label>
                             <Controller
                                control={renewForm.control}
                                name="period"
                                render={({ field }) => (
                                     <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="space-y-2"
                                    >
                                        <div className="flex items-center space-x-2 space-x-reverse">
                                            <RadioGroupItem value="Daily" id="r-d1" />
                                            <Label htmlFor="r-d1">يومي</Label>
                                        </div>
                                        <div className="flex items-center space-x-2 space-x-reverse">
                                            <RadioGroupItem value="Weekly" id="r-d2" />
                                            <Label htmlFor="r-d2">أسبوعي</Label>
                                        </div>
                                         <div className="flex items-center space-x-2 space-x-reverse">
                                            <RadioGroupItem value="Monthly" id="r-d3" />
                                            <Label htmlFor="r-d3">شهري</Label>
                                        </div>
                                    </RadioGroup>
                                )}
                            />
                            {renewForm.formState.errors.period && <p className="text-red-500 text-xs">{renewForm.formState.errors.period.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>نوع التمرين</Label>
                            <Controller
                                name="classes"
                                control={renewForm.control}
                                render={() => (
                                    <div className="space-y-2">
                                         <div className="flex items-center space-x-2 space-x-reverse">
                                            <Checkbox id="r-c1"
                                                defaultChecked={renewForm.getValues("classes").includes("Iron")}
                                                onCheckedChange={(checked) => {
                                                  const currentClasses = renewForm.getValues("classes") || [];
                                                  const newClasses = checked
                                                    ? [...currentClasses, "Iron"]
                                                    : currentClasses.filter((c) => c !== "Iron");
                                                  renewForm.setValue("classes", newClasses, { shouldValidate: true });
                                                }}
                                            />
                                            <Label htmlFor="r-c1">حديد</Label>
                                         </div>
                                          <div className="flex items-center space-x-2 space-x-reverse">
                                             <Checkbox id="r-c2"
                                                defaultChecked={renewForm.getValues("classes").includes("Fitness")}
                                                onCheckedChange={(checked) => {
                                                  const currentClasses = renewForm.getValues("classes") || [];
                                                  const newClasses = checked
                                                    ? [...currentClasses, "Fitness"]
                                                    : currentClasses.filter((c) => c !== "Fitness");
                                                  renewForm.setValue("classes", newClasses, { shouldValidate: true });
                                                }}
                                             />
                                            <Label htmlFor="r-c2">لياقة</Label>
                                          </div>
                                    </div>
                                )}
                            />
                             {renewForm.formState.errors.classes && <p className="text-red-500 text-xs">{renewForm.formState.errors.classes.message}</p>}
                        </div>
                    </div>

                </div>
                <DialogFooter>
                    <Button type="button" onClick={() => setRenewDialogOpen(false)} variant="outline">إلغاء</Button>
                    <Button type="submit" disabled={renewForm.formState.isSubmitting}>تجديد</Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
