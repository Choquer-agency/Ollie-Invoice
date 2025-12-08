import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { 
  CheckCircle2, 
  X,
  FileText,
  Send,
  CreditCard,
  Users,
  BarChart3,
  RefreshCw,
  Sparkles,
  Mail,
  Shield,
  Clock,
  ArrowRight
} from "lucide-react";

// Real client logos for "Trusted By" section
const trustedLogos = [
  "https://fdqnjninitbyeescipyh.supabase.co/storage/v1/object/public/Logos/private/uploads/Client1.svg",
  "https://fdqnjninitbyeescipyh.supabase.co/storage/v1/object/public/Logos/private/uploads/Client2.svg",
  "https://fdqnjninitbyeescipyh.supabase.co/storage/v1/object/public/Logos/private/uploads/Client3.svg",
  "https://fdqnjninitbyeescipyh.supabase.co/storage/v1/object/public/Logos/private/uploads/Client4.svg",
  "https://fdqnjninitbyeescipyh.supabase.co/storage/v1/object/public/Logos/private/uploads/Client5.svg",
  "https://fdqnjninitbyeescipyh.supabase.co/storage/v1/object/public/Logos/private/uploads/Client6.svg",
  "https://fdqnjninitbyeescipyh.supabase.co/storage/v1/object/public/Logos/private/uploads/Client7.svg",
  "https://fdqnjninitbyeescipyh.supabase.co/storage/v1/object/public/Logos/private/uploads/Client8.svg",
  "https://fdqnjninitbyeescipyh.supabase.co/storage/v1/object/public/Logos/private/uploads/Client9.svg",
  "https://fdqnjninitbyeescipyh.supabase.co/storage/v1/object/public/Logos/private/uploads/Client10.svg",
];

// Feature comparison data
const featureCategories = [
  {
    name: "Invoicing",
    icon: FileText,
    features: [
      { name: "Create invoices", free: true, pro: true },
      { name: "Invoices per month", free: "5", pro: "Unlimited" },
      { name: "PDF generation", free: true, pro: true },
      { name: "Invoice templates", free: "1", pro: "More coming soon" },
      { name: "Custom invoice numbers", free: false, pro: "Coming soon" },
      { name: "Line item management", free: true, pro: true },
      { name: "Estimates & quotes", free: false, pro: "Coming soon" },
      { name: "Batch invoicing", free: false, pro: "Coming soon" },
    ],
  },
  {
    name: "Payments",
    icon: CreditCard,
    features: [
      { name: "Online payments (Stripe)", free: true, pro: true },
      { name: "E-Transfer support", free: true, pro: true },
      { name: "Multiple payment options", free: true, pro: true },
      { name: "Partial payments", free: true, pro: true },
      { name: "Payment tracking", free: true, pro: true },
      { name: "Multi-currency support", free: false, pro: "Coming soon" },
    ],
  },
  {
    name: "Client Management",
    icon: Users,
    features: [
      { name: "Client database", free: true, pro: true },
      { name: "Client history", free: true, pro: true },
      { name: "Contact management", free: true, pro: true },
      { name: "Client revenue summary", free: false, pro: "Coming soon" },
    ],
  },
  {
    name: "Communication",
    icon: Mail,
    features: [
      { name: "Email invoices", free: true, pro: true },
      { name: "Shareable payment links", free: true, pro: true },
      { name: "Payment reminders", free: false, pro: "Coming soon" },
      { name: "Custom email templates", free: false, pro: "Coming soon" },
    ],
  },
  {
    name: "Automation",
    icon: RefreshCw,
    features: [
      { name: "Recurring invoices", free: false, pro: true },
      { name: "Auto-generate invoices", free: false, pro: true },
      { name: "Scheduled sending", free: false, pro: "Coming soon" },
    ],
  },
  {
    name: "Branding",
    icon: Sparkles,
    features: [
      { name: "Business logo", free: true, pro: true },
      { name: "Custom branding colors", free: false, pro: true },
    ],
  },
  {
    name: "Analytics & Reporting",
    icon: BarChart3,
    features: [
      { name: "Dashboard overview", free: true, pro: true },
      { name: "Payment status tracking", free: true, pro: true },
      { name: "Revenue reports", free: false, pro: "Coming soon" },
      { name: "Reporting dashboard", free: false, pro: "Coming soon" },
      { name: "Expense tracking", free: false, pro: "Coming soon" },
    ],
  },
  {
    name: "Support",
    icon: Shield,
    features: [
      { name: "Email support", free: true, pro: true },
      { name: "Priority support", free: false, pro: true },
    ],
  },
];

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
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

// Trusted By Logo Marquee Component
function TrustedByMarquee() {
  // Triple the logos for seamless infinite scroll
  const allLogos = [...trustedLogos, ...trustedLogos, ...trustedLogos];
  
  return (
    <div className="relative overflow-hidden py-6">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
      
      <div className="flex animate-marquee" style={{ width: 'fit-content' }}>
        {allLogos.map((logo, i) => (
          <div 
            key={i} 
            className="flex-shrink-0 mx-8 flex items-center justify-center"
          >
            <img 
              src={logo} 
              alt="" 
              className="h-6 w-auto opacity-60 dark:opacity-40 dark:invert grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300"
              onError={(e) => {
                // Hide broken images
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Feature Check/X Component
function FeatureValue({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <CheckCircle2 className="h-5 w-5 text-[#2CA01C]" />
    ) : (
      <X className="h-5 w-5 text-muted-foreground/30" />
    );
  }
  // Style "Coming soon" specially
  if (value.toLowerCase().includes("coming soon")) {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        {value}
      </span>
    );
  }
  return <span className="text-sm font-medium">{value}</span>;
}

export default function Pricing() {
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
                  <Link href="/#pricing">Pricing</Link>
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

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-6">
        <motion.div 
          className="max-w-4xl mx-auto text-center"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.h1 
            className="text-h1 mb-6"
            variants={fadeIn}
          >
            Simple, transparent pricing
          </motion.h1>
          <motion.p 
            className="text-body-large mb-8 max-w-2xl mx-auto"
            variants={fadeIn}
          >
            Everything you need to create professional invoices and get paid faster. Start free, upgrade when you're ready.
          </motion.p>
        </motion.div>
      </section>

      {/* Trusted By Section */}
      <section className="pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-overline text-center mb-4">
            Trusted By
          </p>
          <TrustedByMarquee />
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 px-6">
        <motion.div 
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto items-stretch">
            {/* Free Plan */}
            <motion.div 
              className="rounded-2xl p-6 md:p-8 border bg-background flex flex-col"
              variants={fadeIn}
            >
              <h3 className="text-h3 mb-1">Free</h3>
              <p className="text-body-small text-muted mb-6">Begin with the essentials</p>
              <div className="text-h2 mb-6">
                $0<span className="text-body text-muted">/mo</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {["5 invoices per month", "Online payments", "Multiple payment options", "Email sending", "PDF generation", "Client management"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-body">
                    <CheckCircle2 className="h-4 w-4 text-[#2CA01C]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="w-full rounded-full" asChild>
                <a href="/login" data-testid="button-pricing-free">Start for Free</a>
              </Button>
            </motion.div>
            
            {/* Pro Plan */}
            <motion.div 
              className="rounded-2xl p-6 md:p-8 relative border flex flex-col"
              style={{ 
                backgroundColor: 'rgba(44, 160, 28, 0.08)',
                borderColor: 'rgba(44, 160, 28, 0.4)'
              }}
              variants={fadeIn}
            >
              <div className="absolute -top-3 left-6">
                <span className="text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                  Popular
                </span>
              </div>
              <h3 className="text-h3 mb-1">Pro</h3>
              <p className="text-body-small text-muted mb-6">For growing businesses</p>
              <div className="text-h2 mb-6">
                $10<span className="text-body text-muted">/mo</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {["Unlimited invoices", "Recurring invoices", "Custom branding", "Automated reminders"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-body">
                    <CheckCircle2 className="h-4 w-4 text-[#2CA01C]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="w-full rounded-full" asChild>
                <a href="/login" data-testid="button-pricing-pro">Start for Free</a>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-20 px-6">
        <motion.div 
          className="max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div className="text-center mb-12" variants={fadeIn}>
            <h2 className="text-h2 mb-4">Compare plans</h2>
            <p className="text-body-large text-muted">
              See what's included in each plan
            </p>
          </motion.div>

          {/* Comparison Grid */}
          <motion.div variants={fadeIn} className="border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 bg-muted/50 border-b">
              <div className="p-4 border-r"></div>
              <div className="p-4 text-center border-r">
                <span className="font-medium">Free</span>
                <p className="text-xs text-muted-foreground">$0/mo</p>
              </div>
              <div className="p-4 text-center">
                <span className="font-medium">Pro</span>
                <p className="text-xs text-muted-foreground">$10/mo</p>
              </div>
            </div>

            {/* Feature Categories */}
            {featureCategories.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                {/* Category Header */}
                <div className="flex items-center gap-2 p-4 bg-muted/30 border-b">
                  <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                    <category.icon className="h-4 w-4 text-foreground" />
                  </div>
                  <span className="font-medium">{category.name}</span>
                </div>

                {/* Features */}
                {category.features.map((feature, featureIndex) => (
                  <div 
                    key={featureIndex} 
                    className="grid grid-cols-3 border-b last:border-0"
                  >
                    <div className="p-4 text-sm text-muted-foreground border-r">
                      {feature.name}
                    </div>
                    <div className="p-4 flex justify-center border-r">
                      <FeatureValue value={feature.free} />
                    </div>
                    <div className="p-4 flex justify-center">
                      <FeatureValue value={feature.pro} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </motion.div>

          {/* Bottom CTA */}
          <motion.div 
            className="mt-12 text-center"
            variants={fadeIn}
          >
            <Button className="rounded-full px-8" size="lg" asChild>
              <a href="/login">Start for Free</a>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 md:py-28 px-6 bg-muted/30 border-y overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-badge mb-4">
              <Users size={14} />
              Testimonials
            </span>
            <h2 className="text-h2 mb-4">
              Do not just take our word for it
            </h2>
            <p className="text-body-large text-muted">
              Our users are our best ambassadors. See what they have to say.
            </p>
          </div>

          <div className="relative">
            <div className="flex animate-marquee gap-6 w-fit">
              {[
                { name: "Sarah Mitchell", role: "Freelance Designer", quote: "The cleanest invoicing tool I've ever used. My clients love how easy it is to pay.", avatar: "SM" },
                { name: "Mike Rodriguez", role: "HVAC Contractor", quote: "I can send an invoice from my truck in 30 seconds. My customers pay the same day.", avatar: "MR" },
                { name: "Emma Chen", role: "Marketing Consultant", quote: "I switched from QuickBooks and never looked back. This is exactly what I needed.", avatar: "EC" },
                { name: "David Park", role: "Photographer", quote: "Beautiful invoices that match my brand. Getting paid has never been this simple.", avatar: "DP" },
                { name: "Lisa Thompson", role: "Web Developer", quote: "Finally, an invoicing app that doesn't feel like accounting software. Love it!", avatar: "LT" },
                { name: "Sarah Mitchell", role: "Freelance Designer", quote: "The cleanest invoicing tool I've ever used. My clients love how easy it is to pay.", avatar: "SM" },
                { name: "Mike Rodriguez", role: "HVAC Contractor", quote: "I can send an invoice from my truck in 30 seconds. My customers pay the same day.", avatar: "MR" },
                { name: "Emma Chen", role: "Marketing Consultant", quote: "I switched from QuickBooks and never looked back. This is exactly what I needed.", avatar: "EC" },
                { name: "David Park", role: "Photographer", quote: "Beautiful invoices that match my brand. Getting paid has never been this simple.", avatar: "DP" },
                { name: "Lisa Thompson", role: "Web Developer", quote: "Finally, an invoicing app that doesn't feel like accounting software. Love it!", avatar: "LT" },
              ].map((testimonial, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-80 bg-card border rounded-2xl p-6 shadow-notion hover:scale-105 transition-transform duration-300"
                >
                  <blockquote className="text-body-small text-muted leading-relaxed mb-4">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center text-body-small font-medium">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="text-body-small font-bold">{testimonial.name}</p>
                      <p className="text-caption">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-background overflow-hidden relative">
        {/* Background Decor */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-muted/30 pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-primary/5 to-purple-100/20 dark:to-purple-900/10 rounded-full blur-3xl opacity-50 -z-10"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-badge mb-8"
          >
            <Sparkles size={14} />
            <span>Join 2,000+ freelancers today</span>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-hero mb-6"
          >
            Ready to look more professional?
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-body-large mb-10 max-w-2xl mx-auto"
          >
            Create your first invoice in less than 60 seconds. <br/>
            No credit card required. Cancel anytime.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button size="lg" className="rounded-full px-12 h-14 text-body w-full sm:w-auto" asChild>
              <a href="/login" data-testid="button-final-cta">
                Start for Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-body-small text-muted mt-6"
          >
            Includes 5 free invoices every month.
          </motion.p>
        </div>
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

