"use client";

import { useState } from "react";
import { MoreHorizontal, PlusCircle, Trash2, CalendarIcon, User, Users } from "lucide-react";
import { format } from "date-fns";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

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

const initialMembers: Member[] = [
  {
    id: "1",
    name: "Ahmad Ali",
    subscriptionType: "Monthly Iron",
    startDate: new Date("2024-07-15"),
    endDate: new Date("2024-08-15"),
    status: "Active",
  },
  {
    id: "2",
    name: "Fatima Zahra",
    subscriptionType: "Weekly Fitness",
    startDate: new Date("2024-07-20"),
    endDate: new Date("2024-07-27"),
    status: "Active",
  },
   {
    id: "3",
    name: "Omar Khalid",
    subscriptionType: "Daily Iron",
    startDate: new Date("2024-05-20"),
    endDate: new Date("2024-05-21"),
    status: "Expired",
  },
];

export function MemberManager() {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", subscriptionType: "Monthly Iron" as SubscriptionType });

  const handleAddMember = () => {
    if (!newMember.name || !newMember.subscriptionType) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill all fields.' });
      return;
    }
    
    const startDate = new Date();
    const endDate = calculateEndDate(startDate, newMember.subscriptionType);

    const newMemberData: Member = {
      id: (members.length + 1).toString(),
      name: newMember.name,
      subscriptionType: newMember.subscriptionType,
      startDate,
      endDate,
      status: 'Active',
    };

    setMembers([newMemberData, ...members]);
    toast({ title: 'Success', description: 'New member added.' });
    setDialogOpen(false);
    setNewMember({ name: "", subscriptionType: "Monthly Iron" });
  };
  
  const handleDeleteMember = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
    toast({ title: 'Member deleted.' });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>Member Management</CardTitle>
                <CardDescription>
                Add, view, and manage your gym members.
                </CardDescription>
            </div>
          <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <PlusCircle className="h-4 w-4" />
                <span>Add Member</span>
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
                <Button onClick={() => setDialogOpen(false)} variant="outline">Cancel</Button>
                <Button onClick={handleAddMember}>Add Member</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
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
            {members.map((member) => (
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
                      <DropdownMenuItem onSelect={() => handleDeleteMember(member.id)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
