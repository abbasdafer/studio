"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, PlusCircle, Trash2, CalendarIcon, User, Search, RefreshCw } from "lucide-react";
import { format } from "date-fns";
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

type SubscriptionType = 
  | "Daily Iron" | "Daily Fitness"
  | "Weekly Iron" | "Weekly Fitness"
  | "Monthly Iron" | "Monthly Fitness";

type Member = {
  id: string;
  name: string;
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

export function MemberManager({ gymOwnerId }: { gymOwnerId: string }) {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isRenewDialogOpen, setRenewDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", subscriptionType: "Monthly Iron" as SubscriptionType });
  const [renewalInfo, setRenewalInfo] = useState<{ member: Member | null; type: SubscriptionType }>({ member: null, type: 'Monthly Iron' });
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!gymOwnerId) return;
      try {
        setLoading(true);
        const q = query(collection(db, "members"), where("gymOwnerId", "==", gymOwnerId));
        const querySnapshot = await getDocs(q);
        const membersList = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const endDate = data.endDate.toDate();
            const status = new Date() > endDate ? 'Expired' : 'Active';
            // We could update the status in the DB here, but for now just reflecting it in the UI is fine.
            return {
                id: doc.id,
                name: data.name,
                subscriptionType: data.subscriptionType,
                startDate: data.startDate.toDate(),
                endDate: endDate,
                status: status,
                gymOwnerId: data.gymOwnerId
            } as Member
        }).sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
        setMembers(membersList);
      } catch (error) {
        console.error("Error fetching members: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch members.' });
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [gymOwnerId, toast]);

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.subscriptionType) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill all fields.' });
      return;
    }
    
    const startDate = new Date();
    const endDate = calculateEndDate(startDate, newMember.subscriptionType);

    const newMemberData = {
      name: newMember.name,
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
        toast({ title: 'Success', description: 'New member added.' });
        setAddDialogOpen(false);
        setNewMember({ name: "", subscriptionType: "Monthly Iron" });
    } catch (e) {
        console.error("Error adding document: ", e);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not add member.' });
    }
  };
  
  const handleDeleteMember = async (id: string) => {
    try {
        await deleteDoc(doc(db, "members", id));
        setMembers(members.filter(m => m.id !== id));
        toast({ title: 'Member deleted.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete member.' });
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

        toast({ title: 'Success', description: `Subscription for ${renewalInfo.member.name} has been renewed.` });
        setRenewDialogOpen(false);
        setRenewalInfo({ member: null, type: 'Monthly Iron' });
    } catch (error) {
        console.error("Error renewing subscription: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not renew subscription.' });
    }
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
                  <CardTitle>Member Management</CardTitle>
                  <CardDescription>
                  Add, view, search, and manage your gym members.
                  </CardDescription>
              </div>
            <div className="flex w-full sm:w-auto items-center gap-2">
                 <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by name..."
                        className="pl-8 w-full sm:w-[200px] lg:w-[250px]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                    <Button size="sm" className="gap-1">
                        <PlusCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">Add Member</span>
                    </Button>
                    </DialogTrigger>
                    <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Member</DialogTitle>
                        <DialogDescription>
                        Enter the details of the new member to add them.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} className="col-span-3" placeholder="Member's full name" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">Subscription</Label>
                        <Select value={newMember.subscriptionType} onValueChange={v => setNewMember({...newMember, subscriptionType: v as SubscriptionType})}>
                            <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select subscription type" />
                            </SelectTrigger>
                            <SelectContent>
                            <SelectItem value="Daily Iron">Daily - Iron</SelectItem>
                            <SelectItem value="Daily Fitness">Daily - Fitness</SelectItem>
                            <SelectItem value="Weekly Iron">Weekly - Iron</SelectItem>
                            <SelectItem value="Weekly Fitness">Weekly - Fitness</SelectItem>
                            <SelectItem value="Monthly Iron">Monthly - Iron</SelectItem>
                            <SelectItem value="Monthly Fitness">Monthly - Fitness</SelectItem>
                            </SelectContent>
                        </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setAddDialogOpen(false)} variant="outline">Cancel</Button>
                        <Button onClick={handleAddMember}>Add Member</Button>
                    </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><User className="inline-block mr-2 h-4 w-4" />Name</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead><CalendarIcon className="inline-block mr-2 h-4 w-4" />Start Date</TableHead>
                <TableHead><CalendarIcon className="inline-block mr-2 h-4 w-4" />End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {searchQuery ? 'No members match your search.' : 'No members yet. Click "Add Member" to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
              filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.subscriptionType.replace(' ', ' - ')}</TableCell>
                  <TableCell>{format(member.startDate, "PPP")}</TableCell>
                  <TableCell>{format(member.endDate, "PPP")}</TableCell>
                  <TableCell>
                    <Badge variant={member.status === "Active" ? "default" : "destructive"} className={member.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}>{member.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => openRenewDialog(member)}>
                           <RefreshCw className="mr-2 h-4 w-4" />
                           Renew Subscription
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleDeleteMember(member.id)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
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
      
      {/* Renewal Dialog */}
      <Dialog open={isRenewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Subscription for {renewalInfo.member?.name}</DialogTitle>
            <DialogDescription>
              Select the new subscription type to renew the membership. The start date will be set to today.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="renew-type" className="text-right">New Subscription</Label>
              <Select value={renewalInfo.type} onValueChange={v => setRenewalInfo(prev => ({...prev, type: v as SubscriptionType}))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select subscription type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily Iron">Daily - Iron</SelectItem>
                  <SelectItem value="Daily Fitness">Daily - Fitness</SelectItem>
                  <SelectItem value="Weekly Iron">Weekly - Iron</SelectItem>
                  <SelectItem value="Weekly Fitness">Weekly - Fitness</SelectItem>
                  <SelectItem value="Monthly Iron">Monthly - Iron</SelectItem>
                  <SelectItem value="Monthly Fitness">Monthly - Fitness</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setRenewDialogOpen(false)} variant="outline">Cancel</Button>
            <Button onClick={handleRenewSubscription}>Renew</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
