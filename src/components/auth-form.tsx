"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { DollarSign, Loader2 } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, getDocs, collection, query, where, runTransaction, DocumentSnapshot } from "firebase/firestore";


import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import type { PromoCode } from "./promo-code-manager";
import { Separator } from "./ui/separator";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const signUpSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  promoCode: z.string().min(1, { message: "A valid subscription code is required." }),
  pricing: z.object({
      dailyFitness: z.coerce.number().min(0, "Price must be positive."),
      weeklyFitness: z.coerce.number().min(0, "Price must be positive."),
      monthlyFitness: z.coerce.number().min(0, "Price must be positive."),
      dailyIron: z.coerce.number().min(0, "Price must be positive."),
      weeklyIron: z.coerce.number().min(0, "Price must be positive."),
      monthlyIron: z.coerce.number().min(0, "Price must be positive."),
  })
});

type ValidationResult = 
  | { success: true; type: 'monthly' | 'yearly' }
  | { success: false; error: string };

const validateAndUsePromoCode = async (code: string): Promise<ValidationResult> => {
    const promoCodesRef = collection(db, "promoCodes");
    const q = query(promoCodesRef, where("code", "==", code.trim()));

    try {
        const result = await runTransaction(db, async (transaction) => {
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return { success: false, error: "Invalid or expired promo code." };
            }

            const promoDocRef = querySnapshot.docs[0].ref;
            const transactionalPromoDoc = await transaction.get(promoDocRef);

            if (!transactionalPromoDoc.exists()) {
                 return { success: false, error: "Invalid or expired promo code." };
            }

            const promoData = transactionalPromoDoc.data() as Omit<PromoCode, 'id'>;
            
            if (promoData.status !== 'active' || promoData.uses >= promoData.maxUses) {
                 return { success: false, error: "This promo code has been fully used or is inactive." };
            }
            
            const newUses = promoData.uses + 1;
            transaction.update(promoDocRef, { uses: newUses });
            
            return { success: true, type: promoData.type };
        });
        
        return result;

    } catch (error) {
        console.error("Promo code transaction failed: ", error);
        if (error instanceof Error && (error as any).code) {
           return { success: false, error: `An unexpected error occurred: ${(error as any).code}` };
        }
        return { success: false, error: "Could not validate promo code. Please check server logs." };
    }
};


export function AuthForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { 
        email: "", 
        password: "", 
        promoCode: "",
        pricing: {
            dailyFitness: 0,
            weeklyFitness: 0,
            monthlyFitness: 0,
            dailyIron: 0,
            weeklyIron: 0,
            monthlyIron: 0
        }
    },
  });

  const onLoginSubmit = async (values: z.infer<typeof loginSchema>) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({ title: "Login Successful", description: "Welcome back!" });
      router.push("/dashboard");
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid email or password.",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSignUpSubmit = async (values: z.infer<typeof signUpSchema>) => {
    setLoading(true);
    try {
      const validationResult = await validateAndUsePromoCode(values.promoCode);
      
      if (!validationResult.success) {
        throw new Error(validationResult.error);
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      const startDate = new Date();
      const endDate = new Date();
      if (validationResult.type === 'monthly') {
          endDate.setMonth(startDate.getMonth() + 1);
      } else {
          endDate.setFullYear(startDate.getFullYear() + 1);
      }

      await setDoc(doc(db, "gymOwners", user.uid), {
          email: user.email,
          subscriptionType: validationResult.type,
          subscriptionStartDate: startDate,
          subscriptionEndDate: endDate,
          uid: user.uid,
          pricing: values.pricing, // Save the pricing structure
      });

      toast({
        title: "Sign Up Successful",
        description: "Your account has been created.",
      });
      router.push("/dashboard");

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: error.message || "An error occurred during sign-up.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tabs defaultValue="login" className="w-full max-w-md">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">Log In</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <Card>
          <CardHeader>
            <CardTitle>Gym Manager Login</CardTitle>
            <CardDescription>
              Enter your credentials to access your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="manager@gym.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Log In
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="signup">
        <Card>
          <CardHeader>
            <CardTitle>Create Your Gym Account</CardTitle>
            <CardDescription>
              An active subscription code is required to sign up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...signUpForm}>
              <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)} className="space-y-4">
                <div className="space-y-2">
                    <FormField
                    control={signUpForm.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input placeholder="your@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={signUpForm.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="Must be 8+ characters" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={signUpForm.control}
                    name="promoCode"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Subscription Code</FormLabel>
                        <FormControl>
                            <Input placeholder="Enter your code" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h3 className="text-lg font-medium">Subscription Pricing</h3>
                        <p className="text-sm text-muted-foreground">
                            Set the prices for your member subscriptions.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-4 p-4 border rounded-lg">
                            <h4 className="font-medium text-center">Fitness Prices</h4>
                            <FormField
                                control={signUpForm.control}
                                name="pricing.dailyFitness"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Daily</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input type="number" placeholder="0.00" className="pl-8" {...field} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={signUpForm.control}
                                name="pricing.weeklyFitness"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Weekly</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input type="number" placeholder="0.00" className="pl-8" {...field} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={signUpForm.control}
                                name="pricing.monthlyFitness"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Monthly</FormLabel>
                                    <FormControl>
                                       <div className="relative">
                                            <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input type="number" placeholder="0.00" className="pl-8" {...field} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                         </div>

                         <div className="space-y-4 p-4 border rounded-lg">
                            <h4 className="font-medium text-center">Iron Prices</h4>
                            <FormField
                                control={signUpForm.control}
                                name="pricing.dailyIron"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Daily</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input type="number" placeholder="0.00" className="pl-8" {...field} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={signUpForm.control}
                                name="pricing.weeklyIron"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Weekly</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input type="number" placeholder="0.00" className="pl-8" {...field} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={signUpForm.control}
                                name="pricing.monthlyIron"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Monthly</FormLabel>
                                    <FormControl>
                                       <div className="relative">
                                            <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input type="number" placeholder="0.00" className="pl-8" {...field} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                         </div>
                    </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

    