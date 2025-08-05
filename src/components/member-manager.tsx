"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, PlusCircle, Trash2, CalendarIcon, User, Search, RefreshCw, MessageSquare, Phone } from "lucide-react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, updateDoc } from "firebase/firestore";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";
import { ErrorDisplay } from "./error-display";

type SubscriptionType = 
  | "Daily Iron" | "Daily Fitness"
  | "Weekly Iron" | "Weekly Fitness"
  | "Monthly Iron" | "Monthly Fitness";

type Member = {
  id: string;
  name: string;
  phone?: string;
  subscriptionType: SubscriptionType;
  startDate: Date;
  endDate: Date;
  status: "Active" | "Expired";
  gymOwnerId: string;
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

const translateSubscriptionType = (type: SubscriptionType): string => {
  const translations: Record<SubscriptionType, string> = {
    "Daily Iron": "يومي - حديد",
    "Daily Fitness": "يومي - لياقة",
    "Weekly Iron": "أسبوعي - حديد",
    "Weekly Fitness": "أسبوعي - لياقة",
    "Monthly Iron": "شهري - حديد",
    "Monthly Fitness": "شهري - لياقة",
  };
  return translations[type] || type;
};

export function MemberManager({ gymOwnerId }: { gymOwnerId: string }) {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isRenewDialogOpen, setRenewDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", phone: "", subscriptionType: "Monthly Iron" as SubscriptionType });
  const [renewalInfo, setRenewalInfo] = useState<{ member: Member | null; type: SubscriptionType }>({ member: null, type: 'Monthly Iron' });
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


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
                name: data.name,
                phone: data.phone,
                subscriptionType: data.subscriptionType,
                startDate: data.startDate.toDate(),
                endDate: endDate,
                status: status,
                gymOwnerId: data.gymOwnerId
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

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.subscriptionType) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'اسم العضو ونوع الاشتراك مطلوبان.' });
      return;
    }
    
    const startDate = new Date();
    const endDate = calculateEndDate(startDate, newMember.subscriptionType);

    const newMemberData = {
      name: newMember.name,
      phone: newMember.phone || "",
      subscriptionType: newMember.subscriptionType,
      startDate,
      endDate,
      status: 'Active' as 'Active' | 'Expired',
      gymOwnerId,
    };

    try {
        const docRef = await addDoc(collection(db, "members"), newMemberData);
        const addedMember = { id: docRef.id, ...newMemberData };
        setMembers(prev => [addedMember, ...prev].sort((a, b) => b.startDate.getTime() - a.startDate.getTime()));
        toast({ title: 'نجاح', description: 'تمت إضافة عضو جديد.' });
        setAddDialogOpen(false);
        setNewMember({ name: "", phone: "", subscriptionType: "Monthly Iron" });
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

  const handleRenewSubscription = async () => {
    if (!renewalInfo.member) return;

    const startDate = new Date();
    const endDate = calculateEndDate(startDate, renewalInfo.type);
    
    try {
        const memberRef = doc(db, "members", renewalInfo.member.id);
        await updateDoc(memberRef, {
            subscriptionType: renewalInfo.type,
            startDate: startDate,
            endDate: endDate,
            status: 'Active'
        });

        setMembers(prevMembers => prevMembers.map(m => 
            m.id === renewalInfo.member!.id 
            ? { ...m, subscriptionType: renewalInfo.type, startDate, endDate, status: 'Active' }
            : m
        ).sort((a, b) => b.startDate.getTime() - a.startDate.getTime()));

        toast({ title: 'نجاح', description: `تم تجديد اشتراك ${renewalInfo.member.name}.` });
        setRenewDialogOpen(false);
        setRenewalInfo({ member: null, type: 'Monthly Iron' });
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
    setRenewalInfo({ member, type: member.subscriptionType });
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
                    <DialogContent>
                    <DialogHeader>
                        <DialogTitle>إضافة عضو جديد</DialogTitle>
                        <DialogDescription>
                        أدخل تفاصيل العضو الجديد لإضافته.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">الاسم</Label>
                          <Input id="name" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} className="col-span-3" placeholder="الاسم الكامل للعضو" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="phone" className="text-right">الهاتف</Label>
                          <Input id="phone" value={newMember.phone} onChange={e => setNewMember({...newMember, phone: e.target.value})} className="col-span-3" placeholder="مثال: 9665xxxxxxxx (اختياري)" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="type" className="text-right">الاشتراك</Label>
                          <Select value={newMember.subscriptionType} onValueChange={v => setNewMember({...newMember, subscriptionType: v as SubscriptionType})}>
                              <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="اختر نوع الاشتراك" />
                              </SelectTrigger>
                              <SelectContent>
                              <SelectItem value="Daily Iron">يومي - حديد</SelectItem>
                              <SelectItem value="Daily Fitness">يومي - لياقة</SelectItem>
                              <SelectItem value="Weekly Iron">أسبوعي - حديد</SelectItem>
                              <SelectItem value="Weekly Fitness">أسبوعي - لياقة</SelectItem>
                              <SelectItem value="Monthly Iron">شهري - حديد</SelectItem>
                              <SelectItem value="Monthly Fitness">شهري - لياقة</SelectItem>
                              </SelectContent>
                          </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setAddDialogOpen(false)} variant="outline">إلغاء</Button>
                        <Button onClick={handleAddMember}>إضافة عضو</Button>
                    </DialogFooter>
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
                    <TableHead><CalendarIcon className="inline-block ml-2 h-4 w-4" />تاريخ البدء</TableHead>
                    <TableHead><CalendarIcon className="inline-block ml-2 h-4 w-4" />تاريخ الانتهاء</TableHead>
                    <TableHead>الحالة</TableHead>
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
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>
                        {member.phone ? (
                          <span className="text-muted-foreground" dir="ltr">{member.phone}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">لا يوجد</span>
                        )}
                      </TableCell>
                      <TableCell>{translateSubscriptionType(member.subscriptionType)}</TableCell>
                      <TableCell>{format(member.startDate, "PPP", { locale: arSA })}</TableCell>
                      <TableCell>{format(member.endDate, "PPP", { locale: arSA })}</TableCell>
                      <TableCell>
                        <Badge variant={member.status === "Active" ? "default" : "destructive"} className={cn(member.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', 'hover:bg-opacity-80')}>{member.status === "Active" ? "فعال" : "منتهي"}</Badge>
                      </TableCell>
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
                            <div className="flex items-center gap-3">
                                <div className="font-bold text-lg">{member.name}</div>
                                 <Badge variant={member.status === "Active" ? "default" : "destructive"} className={cn(member.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', 'hover:bg-opacity-80 text-xs')}>{member.status === "Active" ? "فعال" : "منتهي"}</Badge>
                            </div>
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
                                <span>يبدأ في: {format(member.startDate, "PPP", { locale: arSA })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4" />
                                <span>ينتهي في: {format(member.endDate, "PPP", { locale: arSA })}</span>
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
            <DialogTitle>تجديد اشتراك {renewalInfo.member?.name}</DialogTitle>
            <DialogDescription>
              اختر نوع الاشتراك الجديد لتجديد العضوية. سيتم تعيين تاريخ البدء إلى اليوم.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="renew-type" className="text-right">الاشتراك الجديد</Label>
              <Select value={renewalInfo.type} onValueChange={v => setRenewalInfo(prev => ({...prev, type: v as SubscriptionType}))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="اختر نوع الاشتراك" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily Iron">يومي - حديد</SelectItem>
                  <SelectItem value="Daily Fitness">يومي - لياقة</SelectItem>
                  <SelectItem value="Weekly Iron">أسبوعي - حديد</SelectItem>
                  <SelectItem value="Weekly Fitness">أسبوعي - لياقة</SelectItem>
                  <SelectItem value="Monthly Iron">شهري - حديد</SelectItem>
                  <SelectItem value="Monthly Fitness">شهري - لياقة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setRenewDialogOpen(false)} variant="outline">إلغاء</Button>
            <Button onClick={handleRenewSubscription}>تجديد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
