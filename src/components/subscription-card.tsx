import type { LucideIcon } from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SubscriptionCardProps = {
  type: string;
  price: number;
  features: string[];
  Icon: LucideIcon;
  isPopular?: boolean;
  dataAiHint?: string;
};

export function SubscriptionCard({
  type,
  price,
  features,
  Icon,
  isPopular = false,
  dataAiHint,
}: SubscriptionCardProps) {
  return (
    <Card className={cn("flex flex-col overflow-hidden transition-all hover:shadow-lg", isPopular && "border-primary ring-2 ring-primary")}>
        <div className="relative h-40 w-full">
            <Image 
                src="https://placehold.co/600x400"
                alt={`${type} plan image`}
                fill
                className="object-cover"
                data-ai-hint={dataAiHint}
            />
             {isPopular && (
                <Badge className="absolute top-3 right-3 bg-accent text-accent-foreground">
                    Popular
                </Badge>
            )}
        </div>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Icon className="h-8 w-8 text-primary" />
          <CardTitle className="text-2xl">{type} Plan</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500 mt-0.5" />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4 bg-muted/50 p-6">
        <div>
            <p className="text-4xl font-bold">${price}</p>
            <CardDescription>per billing cycle</CardDescription>
        </div>
        <Button className="w-full">Choose Plan</Button>
      </CardFooter>
    </Card>
  );
}
