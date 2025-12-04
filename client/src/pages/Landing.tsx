import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  Receipt,
  Sparkles
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Create in Seconds",
    description: "Build professional invoices with our streamlined editor. Add items, set dates, preview instantly.",
    color: "bg-pastel-yellow",
    tilt: "card-tilt-left",
  },
  {
    icon: Send,
    title: "Send & Get Paid",
    description: "Email invoices directly or share with a magic link. One-click Stripe payment for clients.",
    color: "bg-pastel-mint",
    tilt: "card-tilt-up",
  },
  {
    icon: BarChart3,
    title: "Track Everything",
    description: "Dashboard shows paid, unpaid, and overdue at a glance. Never lose track of payments.",
    color: "bg-pastel-lavender",
    tilt: "card-tilt-right",
  },
];

const howItWorks = [
  {
    icon: FileText,
    title: "Create Invoice",
    description: "Add your client, line items, and due date. Takes just seconds.",
  },
  {
    icon: Send,
    title: "Send or Share",
    description: "Email directly or copy a shareable payment link.",
  },
  {
    icon: CreditCard,
    title: "Get Paid",
    description: "Clients pay via Stripe. You get notified instantly.",
  },
];

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Freelance Designer",
    quote: "The cleanest invoicing tool I've ever used. My clients love how easy it is to pay.",
    color: "bg-pastel-mint",
  },
  {
    name: "Mike Rodriguez",
    role: "HVAC Contractor",
    quote: "I can send an invoice from my truck in 30 seconds. My customers pay the same day.",
    color: "bg-pastel-yellow",
  },
  {
    name: "Emma Chen",
    role: "Marketing Consultant",
    quote: "I switched from QuickBooks and never looked back. This is exactly what I needed.",
    color: "bg-pastel-peach",
  },
  {
    name: "Brian Sugar",
    role: "Founder, PopSugar",
    quote: "Simple, fast, beautiful. Everything an invoicing tool should be.",
    color: "bg-pastel-lavender",
  },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navigation - Simple, minimal */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
            <span className="font-serif text-xl font-semibold tracking-tight">invoy</span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="text-sm" asChild>
              <a href="#pricing" data-testid="link-pricing">Pricing</a>
            </Button>
            <Button size="sm" className="rounded-full px-5" asChild>
              <a href="/api/login" data-testid="link-signup">
                Get Started
                <Sparkles className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 px-6">
        {/* Gradient Orb */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-64 h-64 md:w-80 md:h-80 glow-orb glow-orb-peach" />
        
        <motion.div 
          className="max-w-4xl mx-auto text-center relative z-10"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.h1 
            className="font-serif text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight mb-6 leading-[1.1]"
            variants={fadeInUp}
          >
            Simple invoicing
            <br />
            for <em className="italic">everyone</em>.
          </motion.h1>
          
          <motion.p 
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed"
            variants={fadeInUp}
          >
            Ready to stop chasing payments? Create and send professional invoices in seconds.
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            variants={fadeInUp}
          >
            <Button size="lg" className="rounded-full px-8 text-base" asChild>
              <a href="/api/login" data-testid="button-hero-start">
                Get Started Free
                <Sparkles className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </motion.div>
          
          <motion.p 
            className="text-xs text-muted-foreground mt-5 uppercase tracking-wider"
            variants={fadeInUp}
          >
            Free forever. No credit card required.
          </motion.p>
        </motion.div>
      </section>

      {/* Feature Cards - Plumb Style with Tilt */}
      <section className="py-16 px-6">
        <motion.div 
          className="max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <div className="grid md:grid-cols-3 gap-6 md:gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className={`${feature.color} ${feature.tilt} rounded-2xl p-6 md:p-8 shadow-soft hover-elevate`}
                variants={fadeInUp}
              >
                <h3 className="font-serif text-xl md:text-2xl font-medium mb-3 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
                <div className="mt-6 flex justify-end">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-foreground/5 flex items-center justify-center">
                    <feature.icon className="h-10 w-10 md:h-12 md:w-12 text-foreground/30" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Backers/Social Proof Section */}
      <section className="py-16 px-6 bg-background-alt">
        <div className="max-w-5xl mx-auto text-center">
          <motion.h2 
            className="font-serif text-2xl md:text-3xl font-medium mb-12 italic"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Trusted by small businesses
          </motion.h2>
          
          <motion.div 
            className="flex flex-wrap justify-center gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                className={`${testimonial.color} rounded-full px-4 py-2 flex items-center gap-3`}
                variants={fadeInUp}
              >
                <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-medium">
                  {testimonial.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Content Creation Section - Feature Highlight */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
                Invoicing Made Simple
              </p>
              <h2 className="font-serif text-3xl md:text-5xl font-medium leading-tight mb-6">
                Professional invoices that get you paid.
              </h2>
              <ul className="space-y-4">
                {howItWorks.map((step, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-pastel-mint mt-0.5">
                      <step.icon className="h-4 w-4 text-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{step.title}</p>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
            
            <motion.div
              className="bg-pastel-peach rounded-2xl p-8 md:p-12 shadow-soft-lg"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="aspect-[4/3] rounded-xl bg-foreground/5 flex items-center justify-center">
                <Receipt className="h-20 w-20 text-foreground/20" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Data Analysis Section */}
      <section className="py-20 px-6 bg-background-alt">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              className="bg-pastel-lavender rounded-2xl p-8 md:p-12 shadow-soft-lg order-2 md:order-1"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="aspect-[4/3] rounded-xl bg-foreground/5 flex items-center justify-center">
                <BarChart3 className="h-20 w-20 text-foreground/20" />
              </div>
            </motion.div>
            
            <motion.div
              className="order-1 md:order-2"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
                Dashboard & Analytics
              </p>
              <h2 className="font-serif text-3xl md:text-5xl font-medium leading-tight mb-6">
                Insights you can act on.
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-pastel-lavender mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Real-time payment tracking</p>
                    <p className="text-sm text-muted-foreground">See paid, unpaid, and overdue at a glance</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-pastel-lavender mt-0.5">
                    <Clock className="h-4 w-4 text-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Automated reminders</p>
                    <p className="text-sm text-muted-foreground">Never chase payments manually again</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-pastel-lavender mt-0.5">
                    <Zap className="h-4 w-4 text-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Instant notifications</p>
                    <p className="text-sm text-muted-foreground">Get notified the moment you get paid</p>
                  </div>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-serif text-3xl md:text-5xl font-medium mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-muted-foreground text-lg mb-12">
              Start free, upgrade when you need more
            </p>
          </motion.div>
          
          <motion.div 
            className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div 
              className="bg-card border rounded-2xl p-8 text-left shadow-soft"
              variants={fadeInUp}
            >
              <h3 className="font-serif text-2xl font-medium mb-2">Free</h3>
              <p className="text-muted-foreground text-sm mb-6">For getting started</p>
              <div className="text-4xl font-serif font-medium mb-6">
                $0<span className="text-lg font-sans font-normal text-muted-foreground">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["5 invoices per month", "Stripe payments", "Email sending", "PDF generation", "Client management"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full rounded-full" asChild>
                <a href="/api/login" data-testid="button-pricing-free">Get Started</a>
              </Button>
            </motion.div>
            
            <motion.div 
              className="bg-pastel-mint rounded-2xl p-8 text-left shadow-soft-lg relative"
              variants={fadeInUp}
            >
              <div className="absolute -top-3 left-6">
                <span className="bg-foreground text-background text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
              <h3 className="font-serif text-2xl font-medium mb-2">Pro</h3>
              <p className="text-muted-foreground text-sm mb-6">For growing businesses</p>
              <div className="text-4xl font-serif font-medium mb-6">
                $10<span className="text-lg font-sans font-normal text-muted-foreground">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Unlimited invoices", "Recurring invoices", "Custom branding", "Priority support", "Automated reminders", "Multiple payment options"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="w-full rounded-full" asChild>
                <a href="/api/login" data-testid="button-pricing-pro">Start Free Trial</a>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-pastel-yellow">
        <motion.div 
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-serif text-3xl md:text-5xl font-medium mb-4">
            Ready to get paid faster?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join thousands of small businesses who've simplified their invoicing.
          </p>
          <Button size="lg" className="rounded-full px-8 text-base" asChild>
            <a href="/api/login" data-testid="button-final-cta">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t bg-background">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg font-semibold">invoy</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Simple invoicing for small businesses.
          </p>
        </div>
      </footer>
    </div>
  );
}
