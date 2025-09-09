

"use client";

import { AuthForm } from "@/components/auth-form";
import { Dumbbell, Users, BarChart3, Wallet, Zap, LogIn, UserPlus, Scale, BrainCircuit, Share2, CheckCircle } from "lucide-react";
import Image from 'next/image';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";


const features = [
  {
    icon: <Users className="h-10 w-10 text-primary" />,
    title: "إدارة شاملة للأعضاء",
    description: "أضف، جدد، وابحث عن أعضائك. كل بياناتهم وملفاتهم في مكان واحد آمن ومنظم.",
  },
  {
    icon: <Wallet className="h-10 w-10 text-primary" />,
    title: "نظام متكامل للديون",
    description: "سجل الاشتراكات كديون بسهولة، وتابع المبالغ المدفوعة والمتبقية لكل عضو.",
  },
    {
    icon: <BrainCircuit className="h-10 w-10 text-primary" />,
    title: "خطط غذائية بالذكاء الاصطناعي",
    description: "بضغطة زر، أنشئ خططًا غذائية عراقية مخصصة بناءً على قياسات وسعرات كل متدرب.",
  },
  {
    icon: <Share2 className="h-10 w-10 text-primary" />,
    title: "ملف تشاركي للمتدرب",
    description: "شارك خطة المتدرب الغذائية ومعلومات اشتراكه عبر رابط خاص يفتحه على هاتفه مباشرة.",
  }
]

const pricingPlans = [
    {
        title: "الخطة الشهرية",
        price: "49,000",
        period: "شهرياً",
        features: ["إدارة عدد غير محدود من الأعضاء", "خطط غذائية بالذكاء الاصطناعي", "نظام إدارة الديون", "ملفات تشاركية للأعضاء", "دعم فني عبر البريد الإلكتروني"],
        isPopular: false,
    },
    {
        title: "خطة الـ 6 أشهر",
        price: "250,000",
        period: "لكل 6 أشهر",
        features: ["كل مميزات الخطة الشهرية", "عرض الأرباح والإحصائيات", "تخصيص أسعار الاشتراكات", "دعم فني ذو أولوية"],
        isPopular: true,
    },
    {
        title: "الخطة السنوية",
        price: "499,000",
        period: "سنوياً",
        features: ["كل مميزات خطة الـ 6 أشهر", "الوصول المبكر للميزات الجديدة", "جلسة إعداد ومساعدة أولية"],
        isPopular: false,
    }
]

const faqs = [
    {
        question: "هل يمكنني استخدام النظام على أي جهاز؟",
        answer: "بالتأكيد. تم تصميم التطبيق ليعمل بسلاسة على أي متصفح ويب، سواء كنت تستخدم جهاز كمبيوتر مكتبي في مكتبك أو هاتفك الذكي أثناء تنقلك في صالة الألعاب الرياضية."
    },
    {
        question: "كيف يعمل نظام الديون؟",
        answer: "عند إضافة أو تجديد اشتراك أي عضو، يمكنك تسجيل المبلغ المدفوع كاملاً أو جزءًا منه. يقوم النظام تلقائيًا بحساب الدين المتبقي وتتبعه لك في ملف العضو."
    },
    {
        question: "هل يمكنني تجربة النظام قبل الاشتراك؟",
        answer: "نعم! يمكنك استخدام رمز الاشتراك 'GIFT' عند إنشاء حساب جديد للحصول على فترة تجريبية مجانية لمدة 14 يومًا لاستكشاف جميع الميزات."
    },
     {
        question: "هل أحتاج إلى طابعة؟",
        answer: "لا. يمكنك مشاركة الخطط الغذائية وملفات الأعضاء مباشرة مع المتدربين عبر رابط خاص يفتحونه على هواتفهم، مما يلغي الحاجة للطباعة الورقية."
    }
]

export default function Home() {
  const [isAuthOpen, setAuthOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Dumbbell className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">جيمكو</span>
            </div>
            <div className="flex items-center gap-2">
                 <Button variant="ghost" onClick={() => { setActiveTab('login'); setAuthOpen(true); }}>
                    <LogIn className="ml-2 h-4 w-4" />
                    تسجيل الدخول
                </Button>
                <Button onClick={() => { setActiveTab('signup'); setAuthOpen(true); }}>
                    <UserPlus className="ml-2 h-4 w-4" />
                    إنشاء حساب
                </Button>
            </div>
        </div>
      </header>

      <Dialog open={isAuthOpen} onOpenChange={setAuthOpen}>
          <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="sr-only">Auth</DialogTitle>
                </DialogHeader>
                <AuthForm initialTab={activeTab} />
          </DialogContent>
      </Dialog>
      
      <main className="flex-1">
        {/* Hero Section */}
        <section id="hero" className="w-full py-20 md:py-32 lg:py-40">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-center gap-4 mb-6 animate-slide-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}>
                <Dumbbell className="h-16 w-16 text-primary" />
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-foreground">
                  جيمكو
                </h1>
              </div>
              <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-8 animate-slide-in-up" style={{ animationDelay: '0.4s', animationFillMode: 'backwards' }}>
                الحل الرقمي الأول في العراق لإدارة النوادي الرياضية. ركز على متدربيك ودعنا نهتم بالاشتراكات، الديون، والخطط الغذائية.
              </p>
               <div className="animate-slide-in-up" style={{ animationDelay: '0.6s', animationFillMode: 'backwards' }}>
                 <Button size="lg" onClick={() => { setActiveTab('signup'); setAuthOpen(true); }}>
                      <Zap className="ml-2 h-5 w-5" />
                      ابدأ الآن مع 14 يوم مجاني
                  </Button>
               </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-20 md:py-28 lg:py-32 bg-card">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-2xl mx-auto animate-fade-in">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">مصمم خصيصاً ليناسب احتياجات الجيم العراقي</h2>
                    <p className="mt-4 text-lg text-muted-foreground">أدوات قوية وبسيطة لحل المشاكل اليومية التي تواجهها.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
                    {features.map((feature, index) => (
                        <div key={index} className="bg-background p-6 rounded-lg shadow-md text-center flex flex-col items-center animate-slide-in-up" style={{ animationDelay: `${0.2 * (index + 1)}s`, animationFillMode: 'backwards' }}>
                            <div className="mb-4 bg-primary/10 p-4 rounded-full">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                            <p className="text-muted-foreground">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

         {/* Pricing Section */}
        <section id="pricing" className="w-full py-20 md:py-28 lg:py-32 bg-background">
            <div className="container mx-auto px-4 md:px-6">
                 <div className="text-center max-w-2xl mx-auto animate-fade-in">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">خطط أسعار مرنة</h2>
                    <p className="mt-4 text-lg text-muted-foreground">اختر الخطة التي تناسب حجم وطموح ناديك. ابدأ مجاناً لمدة 14 يومًا باستخدام الرمز <code className="font-mono bg-muted text-primary px-1.5 py-0.5 rounded-md">GIFT</code>.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12 max-w-5xl mx-auto">
                    {pricingPlans.map((plan, index) => (
                        <Card key={index} className={cn("flex flex-col animate-slide-in-up", plan.isPopular && "border-primary ring-2 ring-primary shadow-lg")} style={{ animationDelay: `${0.2 * (index + 1)}s`, animationFillMode: 'backwards' }}>
                           {plan.isPopular && (
                                <div className="bg-primary text-primary-foreground text-center py-1.5 text-sm font-semibold rounded-t-lg">الأكثر شيوعاً</div>
                            )}
                            <CardHeader className="text-center">
                                <CardTitle className="text-2xl">{plan.title}</CardTitle>
                                <CardDescription className="text-4xl font-bold text-foreground">{plan.price} <span className="text-lg font-medium text-muted-foreground">د.ع</span></CardDescription>
                                <p className="text-muted-foreground">{plan.period}</p>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <ul className="space-y-3 text-right">
                                    {plan.features.map((feature, fIndex) => (
                                        <li key={fIndex} className="flex items-center gap-2">
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <div className="p-6 pt-0 mt-auto">
                                <Button className="w-full" variant={plan.isPopular ? "default" : "outline"} onClick={() => { setActiveTab('signup'); setAuthOpen(true); }}>ابدأ الآن</Button>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="w-full py-20 md:py-28 lg:py-32 bg-card">
            <div className="container mx-auto px-4 md:px-6 max-w-3xl">
                 <div className="text-center mb-12 animate-fade-in">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">أسئلة شائعة</h2>
                    <p className="mt-4 text-lg text-muted-foreground">لديك أسئلة؟ لدينا إجابات.</p>
                </div>
                <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, index) => (
                         <AccordionItem key={index} value={`item-${index+1}`} className="animate-slide-in-up" style={{ animationDelay: `${0.1 * (index + 1)}s`, animationFillMode: 'backwards' }}>
                            <AccordionTrigger className="text-lg font-semibold text-right">{faq.question}</AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-base">
                            {faq.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
      </main>

      <footer className="bg-background border-t py-6">
        <div className="container mx-auto px-4 md:px-6 text-center text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} جيمكو. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}

    
