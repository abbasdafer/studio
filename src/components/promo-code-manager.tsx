"use client";

import { useState } from "react";
import { MoreHorizontal, PlusCircle, Trash2 } from "lucide-react";

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
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";

type PromoCode = {
  id: string;
  code: string;
  type: "Monthly Subscription" | "Yearly Subscription";
  status: "Active" | "Used";
  uses: number;
  maxUses: number;
};

const initialPromoCodes: PromoCode[] = [
  { id: '1', code: "YEARLYACCESS", type: "Yearly Subscription", status: "Active", uses: 5, maxUses: 100 },
  { id: '2', code: "MONTHLYTRIAL", type: "Monthly Subscription", status: "Active", uses: 23, maxUses: 50 },
  { id: '3', code: "EXPIREDCODE", type: "Monthly Subscription", status: "Used", uses: 10, maxUses: 10 },
];

export function PromoCodeManager() {
  const { toast } = useToast();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>(initialPromoCodes);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [newCode, setNewCode] = useState({ code: "", type: "Monthly Subscription" as const, maxUses: "1" });

  const generateRandomCode = () => {
    const typePrefix = newCode.type.startsWith("Monthly") ? "MONTHLY" : "YEARLY";
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    setNewCode(prev => ({...prev, code: `${typePrefix}${randomPart}`}));
  };
  
  const handleAddCode = () => {
    if (!newCode.code || !newCode.type || !newCode.maxUses) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill all fields.' });
      return;
    }

    const newPromo: PromoCode = {
      id: (promoCodes.length + 1).toString(),
      code: newCode.code,
      type: newCode.type,
      status: 'Active',
      uses: 0,
      maxUses: parseInt(newCode.maxUses, 10),
    };

    setPromoCodes([newPromo, ...promoCodes]);
    toast({ title: 'Success', description: 'Subscription code created.' });
    setDialogOpen(false);
    setNewCode({ code: "", type: "Monthly Subscription", maxUses: "1" });
  };
  
  const handleDeleteCode = (id: string) => {
    setPromoCodes(promoCodes.filter(c => c.id !== id));
    toast({ title: 'Subscription code deleted.' });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>Subscription Codes</CardTitle>
                <CardDescription>
                Create and manage subscription codes for new gym managers.
                </CardDescription>
            </div>
          <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add Code
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Subscription Code</DialogTitle>
                <DialogDescription>
                  Generate a new code to give to a new customer.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="code" className="text-right">Code</Label>
                  <Input id="code" value={newCode.code} onChange={e => setNewCode({...newCode, code: e.target.value})} className="col-span-2" />
                  <Button variant="outline" size="sm" onClick={generateRandomCode}>Random</Button>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">Type</Label>
                  <Select value={newCode.type} onValueChange={v => setNewCode({...newCode, type: v as "Monthly Subscription" | "Yearly Subscription"})}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monthly Subscription">Monthly Subscription</SelectItem>
                      <SelectItem value="Yearly Subscription">Yearly Subscription</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="maxUses" className="text-right">Max Uses</Label>
                  <Input id="maxUses" type="number" value={newCode.maxUses} onChange={e => setNewCode({...newCode, maxUses: e.target.value})} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddCode}>Create Code</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <div className="border-t">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promoCodes.map((promo) => (
              <TableRow key={promo.id}>
                <TableCell className="font-medium">{promo.code}</TableCell>
                <TableCell>{promo.type}</TableCell>
                <TableCell>
                  <Badge variant={promo.status === "Active" ? "default" : "secondary"} className={promo.status === 'Active' ? 'bg-green-500/20 text-green-700 hover:bg-green-500/30' : ''}>{promo.status}</Badge>
                </TableCell>
                <TableCell>{promo.uses} / {promo.maxUses}</TableCell>
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
                      <DropdownMenuItem onSelect={() => handleDeleteCode(promo.id)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
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
      </div>
    </Card>
  );
}
