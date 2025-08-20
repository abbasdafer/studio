"use client";

import { AuthForm } from "@/components/auth-form";
import { Dumbbell, Users, BarChart3, ShieldCheck, Zap, LogIn } from "lucide-react";
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
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";


const features = [
  {
    icon: <Users className="h-10 w-10 text-primary" />,
    title: "إدارة سهلة للأعضاء",
    description: "أضف، جدد، وابحث عن أعضائك بسهولة. كل بياناتهم في مكان واحد آمن.",
  },
  {
    icon: <BarChart3 className="h-10 w-10 text-primary" />,
    title: "تتبع الأرباح بذكاء",
    description: "شاهد إيراداتك تنمو مع لوحة تحكم تعرض لك الأرباح الشهرية والإجمالية.",
  },
  {
    icon: <Zap className="h-10 w-10 text-primary" />,
    title: "تذكيرات واتساب فورية",
    description: "أرسل تذكيرات تجديد الاشتراك لأعضائك مباشرة عبر الواتساب بنقرة واحدة.",
  },
  {
    icon: <ShieldCheck className="h-10 w-10 text-primary" />,
    title: "آمن وموثوق",
    description: "بياناتك وبيانات عملائك محمية بأحدث تقنيات الأمان من Firebase.",
  }
]

const faqs = [
    {
        question: "هل بياناتي آمنة؟",
        answer: "بالتأكيد. نحن نستخدم Firebase من Google، مما يعني أن جميع بياناتك مخزنة ومحمية على واحدة من أكثر البنى التحتية أمانًا في العالم."
    },
    {
        question: "هل يمكنني تجربة النظام قبل الاشتراك؟",
        answer: "نعم! يمكنك استخدام رمز اشتراك صالح للوصول إلى جميع الميزات. يتيح لك هذا استكشاف النظام بالكامل لمعرفة ما إذا كان يناسب احتياجاتك."
    },
    {
        question: "كيف يعمل نظام تذكيرات الواتساب؟",
        answer: "ببساطة، عند انتهاء اشتراك عضو لديه رقم هاتف مسجل، يظهر زر بجانبه. عند النقر عليه، يتم فتح محادثة واتساب مع رسالة تذكير جاهزة للإرسال."
    },
    {
        question: "هل يمكنني تخصيص أسعار اشتراكاتي؟",
        answer: "نعم، عند إنشاء حسابك لأول مرة، يمكنك تحديد أسعار مختلفة للاشتراكات اليومية والأسبوعية والشهرية، سواء للياقة أو الحديد."
    }
]

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Dumbbell className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">جيمكو</span>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                    <LogIn className="ml-2 h-4 w-4" />
                    تسجيل الدخول
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                  <DialogTitle className="sr-only">تسجيل الدخول أو إنشاء حساب</DialogTitle>
                  <AuthForm />
              </DialogContent>
            </Dialog>
        </div>
      </header>
      <main className="flex-1">
        {/* Hero Section */}
        <section id="hero" className="w-full py-20 md:py-32 lg:py-40">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-center gap-4 mb-6">
                <Dumbbell className="h-16 w-16 text-primary" />
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-foreground">
                  جيمكو
                </h1>
              </div>
              <p className="max-w-xl mx-auto text-lg md:text-xl text-muted-foreground mb-8">
                الحل المتكامل لإدارة أعضاء ناديك الرياضي، والاشتراكات، والأرباح. ركز على رياضييك ودعنا نهتم بالباقي.
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-20 md:py-28 lg:py-32 bg-card">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-2xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">كل ما تحتاجه لإدارة ناديك</h2>
                    <p className="mt-4 text-lg text-muted-foreground">من الأعضاء إلى الأرباح، كل شيء في نظام واحد سهل الاستخدام.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
                    {features.map((feature, index) => (
                        <div key={index} className="bg-background p-6 rounded-lg shadow-md text-center flex flex-col items-center">
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

        {/* FAQ Section */}
        <section id="faq" className="w-full py-20 md:py-28 lg:py-32 bg-background">
            <div className="container mx-auto px-4 md:px-6 max-w-3xl">
                 <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">أسئلة شائعة</h2>
                    <p className="mt-4 text-lg text-muted-foreground">لديك أسئلة؟ لدينا إجابات.</p>
                </div>
                <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, index) => (
                         <AccordionItem key={index} value={`item-${index+1}`}>
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

      <footer className="bg-card border-t py-6">
        <div className="container mx-auto px-4 md:px-6 text-center text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} جيمكو. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}
