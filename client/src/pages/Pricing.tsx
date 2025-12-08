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
  Clock
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
      { name: "Invoice templates", free: "1", pro: "Multiple" },
      { name: "Custom invoice numbers", free: true, pro: true },
      { name: "Line item management", free: true, pro: true },
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
    ],
  },
  {
    name: "Client Management",
    icon: Users,
    features: [
      { name: "Client database", free: true, pro: true },
      { name: "Client history", free: true, pro: true },
      { name: "Contact management", free: true, pro: true },
    ],
  },
  {
    name: "Communication",
    icon: Mail,
    features: [
      { name: "Email invoices", free: true, pro: true },
      { name: "Shareable payment links", free: true, pro: true },
      { name: "Automated reminders", free: false, pro: true },
      { name: "Custom email templates", free: false, pro: true },
    ],
  },
  {
    name: "Automation",
    icon: RefreshCw,
    features: [
      { name: "Recurring invoices", free: false, pro: true },
      { name: "Auto-generate invoices", free: false, pro: true },
      { name: "Scheduled sending", free: false, pro: true },
    ],
  },
  {
    name: "Branding",
    icon: Sparkles,
    features: [
      { name: "Business logo", free: true, pro: true },
      { name: "Custom branding colors", free: false, pro: true },
      { name: "White-label invoices", free: false, pro: true },
    ],
  },
  {
    name: "Analytics & Reporting",
    icon: BarChart3,
    features: [
      { name: "Dashboard overview", free: true, pro: true },
      { name: "Payment status tracking", free: true, pro: true },
      { name: "Revenue reports", free: false, pro: true },
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
  return (
    <div className="relative overflow-hidden py-6">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
      
      <div className="flex animate-marquee">
        {[...trustedLogos, ...trustedLogos].map((logo, i) => (
          <div 
            key={i} 
            className="flex-shrink-0 mx-12 flex items-center justify-center"
          >
            <img 
              src={logo} 
              alt="Client logo" 
              className="h-8 w-auto opacity-60 dark:opacity-40 dark:invert grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300"
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
            className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight mb-6 leading-[1.1]"
            variants={fadeIn}
          >
            Simple, transparent pricing
          </motion.h1>
          <motion.p 
            className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto"
            variants={fadeIn}
          >
            Everything you need to create professional invoices and get paid faster. Start free, upgrade when you're ready.
          </motion.p>
        </motion.div>
      </section>

      {/* Trusted By Section */}
      <section className="pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-xs uppercase tracking-wider text-muted-foreground mb-4">
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
              <h3 className="text-xl font-medium mb-1">Free</h3>
              <p className="text-sm text-muted-foreground mb-6">Begin with the essentials</p>
              <div className="text-4xl font-medium mb-6">
                $0<span className="text-base font-normal text-muted-foreground">/mo</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {["5 invoices per month", "Online payments", "Multiple payment options", "Email sending", "PDF generation", "Client management"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
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
              <h3 className="text-xl font-medium mb-1">Pro</h3>
              <p className="text-sm text-muted-foreground mb-6">For growing businesses</p>
              <div className="text-4xl font-medium mb-6">
                $10<span className="text-base font-normal text-muted-foreground">/mo</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {["Unlimited invoices", "Recurring invoices", "Custom branding", "Automated reminders"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
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
            <h2 className="text-3xl font-medium mb-4">Compare plans</h2>
            <p className="text-muted-foreground">
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

      {/* FAQ or Additional Info could go here */}

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

