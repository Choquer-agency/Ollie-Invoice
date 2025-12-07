import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { 
  FileText, 
  Send, 
  CreditCard, 
  BarChart3, 
  Clock, 
  Zap, 
  CheckCircle2, 
  ArrowRight,
  Globe,
  Palette,
  Code,
  PenTool,
  MessageCircle
} from "lucide-react";

const skills = [
  { icon: Globe, label: "Web Design" },
  { icon: Palette, label: "Figma" },
  { icon: PenTool, label: "Copywriting" },
  { icon: Code, label: "Front end" },
  { icon: FileText, label: "Invoicing" },
];

const features = [
  {
    icon: FileText,
    title: "Create in Seconds",
    description: "Build professional invoices with our streamlined editor. Add items, set dates, preview instantly.",
  },
  {
    icon: Send,
    title: "Send & Get Paid",
    description: "Email invoices directly or share with a magic link. One-click payment options for clients.",
  },
  {
    icon: BarChart3,
    title: "Track Everything",
    description: "Dashboard shows paid, unpaid, and overdue at a glance. Never lose track of payments.",
  },
];

const howItWorks = [
  {
    step: "01",
    icon: FileText,
    title: "Create Invoice",
    description: "Add your client, line items, and due date. Takes just seconds.",
  },
  {
    step: "02",
    icon: Send,
    title: "Send or Share",
    description: "Email directly or copy a shareable payment link.",
  },
  {
    step: "03",
    icon: CreditCard,
    title: "Get Paid",
    description: "Clients pay online instantly. You get notified right away.",
  },
];

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Freelance Designer",
    quote: "The cleanest invoicing tool I've ever used. My clients love how easy it is to pay.",
  },
  {
    name: "Mike Rodriguez",
    role: "HVAC Contractor",
    quote: "I can send an invoice from my truck in 30 seconds. My customers pay the same day.",
  },
  {
    name: "Emma Chen",
    role: "Marketing Consultant",
    quote: "I switched from QuickBooks and never looked back. This is exactly what I needed.",
  },
];

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export default function Landing() {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center" data-testid="link-home">
            <img 
              src="https://fdqnjninitbyeescipyh.supabase.co/storage/v1/object/public/Logos/private/uploads/Ollie%20Invoice.svg" 
              alt="Ollie Invoice" 
              className="h-4 w-auto"
            />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isAuthenticated ? (
              <Button size="sm" className="rounded-full px-5" asChild>
                <Link href="/dashboard" data-testid="link-dashboard">
                  Dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="text-sm hidden sm:inline-flex" asChild>
                  <a href="#pricing" data-testid="link-pricing">Pricing</a>
                </Button>
                <Button size="sm" className="rounded-full px-5" asChild>
                  <a href="/login" data-testid="link-signup">
                    Get Started
                  </a>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section - Clean, Minimal */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24 px-6">
        <motion.div 
          className="max-w-4xl mx-auto"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          {/* Left-aligned hero like reference */}
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <motion.h1 
                className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight mb-6 leading-[1.1]"
                variants={fadeIn}
              >
                Simple invoicing for small businesses.
              </motion.h1>
              
              <motion.p 
                className="text-lg text-muted-foreground mb-8 leading-relaxed"
                variants={fadeIn}
              >
                Create and send professional invoices in seconds. Get paid faster with online payments and magic links.
              </motion.p>
              
              <motion.div variants={fadeIn}>
                <Button size="lg" className="rounded-full px-8" asChild>
                  <a href="/login" data-testid="button-hero-start">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Get Started Free
                  </a>
                </Button>
              </motion.div>
              
              {/* Skill Pills - Notion Style */}
              <motion.div 
                className="flex flex-wrap gap-2 mt-10"
                variants={fadeIn}
              >
                {skills.map((skill, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1.5 bg-card border rounded-full text-sm"
                  >
                    <skill.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{skill.label}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right side - Feature preview cards */}
            <motion.div 
              className="grid grid-cols-2 gap-3"
              variants={fadeIn}
            >
              <div className="col-span-2 bg-card border rounded-2xl p-6 shadow-notion">
                <div className="aspect-video rounded-lg bg-muted/50 flex items-center justify-center">
                  <FileText className="h-12 w-12 text-muted-foreground/30" />
                </div>
              </div>
              <div className="bg-card border rounded-2xl p-4 shadow-notion">
                <div className="aspect-square rounded-lg bg-muted/50 flex items-center justify-center">
                  <BarChart3 className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </div>
              <div className="bg-card border rounded-2xl p-4 shadow-notion">
                <div className="aspect-square rounded-lg bg-muted/50 flex items-center justify-center">
                  <CreditCard className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Testimonial Card - Notion Style */}
      <section className="py-12 px-6">
        <motion.div 
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
        >
          <div className="bg-card border rounded-2xl p-6 md:p-8 shadow-notion">
            <blockquote className="text-lg md:text-xl leading-relaxed mb-6">
              "{testimonials[0].quote}"
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                {testimonials[0].name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="font-medium text-sm">{testimonials[0].name}</p>
                <p className="text-sm text-muted-foreground">{testimonials[0].role}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-24 px-6">
        <motion.div 
          className="max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div className="text-center mb-12" variants={fadeIn}>
            <h2 className="text-2xl md:text-3xl font-medium mb-3">
              Everything you need to get paid
            </h2>
            <p className="text-muted-foreground">
              Professional invoicing tools designed for simplicity
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="bg-card border rounded-2xl p-6 shadow-notion hover-elevate"
                variants={fadeIn}
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 px-6 bg-card border-y">
        <motion.div 
          className="max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div className="text-center mb-12" variants={fadeIn}>
            <h2 className="text-2xl md:text-3xl font-medium mb-3">
              How it works
            </h2>
            <p className="text-muted-foreground">
              Three simple steps to get paid faster
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((step, index) => (
              <motion.div
                key={index}
                className="text-center"
                variants={fadeIn}
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <span className="text-sm font-medium text-muted-foreground">{step.step}</span>
                </div>
                <h3 className="text-lg font-medium mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* More Testimonials */}
      <section className="py-16 md:py-24 px-6">
        <motion.div 
          className="max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div className="text-center mb-12" variants={fadeIn}>
            <h2 className="text-2xl md:text-3xl font-medium mb-3">
              Loved by small businesses
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                className="bg-card border rounded-2xl p-6 shadow-notion"
                variants={fadeIn}
              >
                <blockquote className="text-sm leading-relaxed mb-4">
                  "{testimonial.quote}"
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 md:py-24 px-6 bg-card border-y">
        <motion.div 
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div className="text-center mb-12" variants={fadeIn}>
            <h2 className="text-2xl md:text-3xl font-medium mb-3">
              Simple, transparent pricing
            </h2>
            <p className="text-muted-foreground">
              Start free, upgrade when you need more
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <motion.div 
              className="bg-background border rounded-2xl p-6 md:p-8 shadow-notion"
              variants={fadeIn}
            >
              <h3 className="text-xl font-medium mb-1">Free</h3>
              <p className="text-sm text-muted-foreground mb-6">For getting started</p>
              <div className="text-4xl font-medium mb-6">
                $0<span className="text-base font-normal text-muted-foreground">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["5 invoices per month", "Online payments", "Email sending", "PDF generation", "Client management"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full rounded-full" asChild>
                <a href="/login" data-testid="button-pricing-free">Get Started</a>
              </Button>
            </motion.div>
            
            <motion.div 
              className="bg-foreground text-background rounded-2xl p-6 md:p-8 relative"
              variants={fadeIn}
            >
              <div className="absolute -top-3 left-6">
                <span className="bg-background text-foreground text-xs font-medium px-3 py-1 rounded-full border">
                  Most Popular
                </span>
              </div>
              <h3 className="text-xl font-medium mb-1">Pro</h3>
              <p className="text-sm opacity-70 mb-6">For growing businesses</p>
              <div className="text-4xl font-medium mb-6">
                $10<span className="text-base font-normal opacity-70">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Unlimited invoices", "Recurring invoices", "Custom branding", "Priority support", "Automated reminders", "Multiple payment options"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 opacity-70" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button variant="secondary" className="w-full rounded-full bg-background text-foreground" asChild>
                <a href="/login" data-testid="button-pricing-pro">Start Free Trial</a>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 px-6">
        <motion.div 
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl md:text-3xl font-medium mb-4">
            Ready to get paid faster?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of small businesses who've simplified their invoicing.
          </p>
          <Button size="lg" className="rounded-full px-8" asChild>
            <a href="/login" data-testid="button-final-cta">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <img 
              src="https://fdqnjninitbyeescipyh.supabase.co/storage/v1/object/public/Logos/private/uploads/Ollie%20Invoice.svg" 
              alt="Ollie Invoice" 
              className="h-4 w-auto"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Simple invoicing for small businesses.
          </p>
        </div>
      </footer>
    </div>
  );
}
