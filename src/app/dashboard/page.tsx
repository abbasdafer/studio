import { UserNav } from "@/components/user-nav";
import { SubscriptionCard } from "@/components/subscription-card";
import { Dumbbell, Shield, Calendar, CalendarDays, CalendarMonth } from "lucide-react";

const subscriptions = [
  {
    title: "Daily Pass",
    icon: Calendar,
    plans: [
      { type: "Standard", price: 5, features: ["Basic equipment access", "Locker room"], icon: Shield, dataAiHint: "gym workout" },
      { type: "Iron", price: 8, features: ["All Standard features", "Access to free weights area", "Towel service"], icon: Dumbbell, dataAiHint: "weightlifting" },
    ],
  },
  {
    title: "Weekly Pass",
    icon: CalendarDays,
    plans: [
      { type: "Standard", price: 20, features: ["7-day access", "Basic equipment access", "Locker room"], icon: Shield, dataAiHint: "fitness class" },
      { type: "Iron", price: 30, features: ["All Standard features", "Access to all classes", "Towel service"], icon: Dumbbell, dataAiHint: "gym interior" },
    ],
  },
  {
    title: "Monthly Pass",
    icon: CalendarMonth,
    plans: [
      { type: "Standard", price: 50, features: ["30-day access", "Basic equipment access", "Locker room"], icon: Shield, dataAiHint: "personal training" },
      { type: "Iron", price: 75, features: ["All Standard features", "Personal trainer consultation", "Smoothie bar discount"], icon: Dumbbell, dataAiHint: "bodybuilder" },
    ],
  },
];

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 sm:px-8">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">GymPass Pro</h1>
        </div>
        <UserNav />
      </header>
      <main className="flex-1 p-4 md:p-8">
        <div className="container mx-auto">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Choose Your Perfect Plan
            </h2>
            <p className="mt-2 text-muted-foreground md:text-xl/relaxed">
              Select a subscription that fits your lifestyle.
            </p>
          </div>

          <div className="space-y-12">
            {subscriptions.map((sub, index) => (
              <div key={index}>
                <div className="flex items-center gap-3 mb-6">
                    <sub.icon className="h-7 w-7 text-primary" />
                    <h3 className="text-2xl font-semibold tracking-tight">{sub.title}</h3>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {sub.plans.map((plan, planIndex) => (
                    <SubscriptionCard
                      key={planIndex}
                      type={plan.type}
                      price={plan.price}
                      features={plan.features}
                      Icon={plan.icon}
                      dataAiHint={plan.dataAiHint}
                      isPopular={plan.type === "Iron"}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
