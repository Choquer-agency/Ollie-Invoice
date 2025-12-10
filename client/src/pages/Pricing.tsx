import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { trackCTAClicked, trackPricingViewed, trackFAQOpened } from "@/lib/analytics";
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
  Plus,
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

// FAQ data
const faqData = [
  {
    question: "Is Ollie really free?",
    answer: "Yes! Our Starter plan is completely free and includes 3 invoices per month. It's not a trial—it's a forever-free plan designed for freelancers just starting out. No credit card required to sign up."
  },
  {
    question: "How do I get paid?",
    answer: "You can connect your Stripe account to accept credit cards directly on the invoice. We also support e-transfers by allowing you to display your payment instructions clearly on every invoice sent."
  },
  {
    question: "Can I remove the Ollie branding?",
    answer: "Yes, on our Unlimited plan ($10/mo), all Ollie branding is removed. You can upload your own logo, choose your brand colors, and make the invoice look entirely like your own business document."
  },
  {
    question: "Is my financial data secure?",
    answer: "Absolutely. We use bank-grade 256-bit encryption and our infrastructure is built on the same secure servers used by Amazon and Stripe. We do not sell your data to third parties."
  },
  {
    question: "Does my client need an account to pay?",
    answer: "No. When you send an invoice, your client receives a secure link. They can view the invoice and pay immediately as a guest without ever needing to create a password or log in."
  },
  {
    question: "Can I set up recurring invoices?",
    answer: "Yes! You can automate your billing by setting up recurring invoices for weekly, monthly, or annual retainers. We'll automatically generate and send them on your schedule."
  },
  {
    question: "What currencies do you support?",
    answer: "We support over 135+ currencies through our Stripe integration. Whether you're billing in USD, CAD, EUR, or GBP, Ollie handles the formatting and symbols automatically."
  },
  {
    question: "Can I export my data for tax season?",
    answer: "Yes, you can export all your invoices and expense data to CSV or PDF formats at any time. This makes handing off your finances to an accountant incredibly simple."
  },
  {
    question: "What happens if a client doesn't pay?",
    answer: "Ollie tracks the status of every invoice. If an invoice becomes overdue, we can automatically send a friendly payment reminder email to your client so you don't have to have the awkward conversation."
  },
  {
    question: "Is there a mobile app?",
    answer: "Ollie is fully responsive and works perfectly in your mobile browser. You can create, send, and track invoices from your phone just as easily as you can from your desktop."
  }
];

// FAQ Item Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    if (!isOpen) {
      trackFAQOpened(question);
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="border-b border-border last:border-0">
      <button 
        onClick={handleToggle}
        className="w-full py-6 flex items-center justify-between text-left group cursor-pointer"
      >
        <span className={`text-base font-medium transition-colors duration-200 ${isOpen ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
          {question}
        </span>
        <span className={`
            relative flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-200 flex-shrink-0 ml-4
            ${isOpen ? 'bg-foreground border-foreground text-background' : 'bg-card border-border text-muted-foreground group-hover:border-foreground/50 group-hover:text-foreground'}
        `}>
             <motion.div 
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
             >
                <Plus size={16} />
             </motion.div>
        </span>
      </button>
      <AnimatePresence>
        {isOpen && (
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
            >
                <p className="pb-6 text-muted-foreground leading-relaxed text-sm pr-12">
                    {answer}
                </p>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
  
  // Track pricing page view
  useEffect(() => {
    trackPricingViewed('direct');
  }, []);
  
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
                {["3 invoices per month", "Online payments", "Multiple payment options", "Email sending", "PDF generation", "Client management"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-[#2CA01C]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="w-full rounded-full" asChild>
                <a href="/login" data-testid="button-pricing-free" onClick={() => trackCTAClicked('pricing_page')}>Start for Free</a>
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
                <a href="/login" data-testid="button-pricing-pro" onClick={() => trackCTAClicked('pricing_page')}>Start for Free</a>
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

      {/* FAQ Section */}
      <section className="py-24 px-6 bg-background">
        <div className="max-w-3xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-muted border text-muted-foreground text-sm font-medium mb-4">
              FAQ
            </span>
            <h2 className="text-3xl md:text-4xl font-heading font-semibold mb-4">
              Common questions
            </h2>
            <p className="text-muted-foreground">
              Everything you need to know about the product and billing.
            </p>
          </motion.div>

          <motion.div 
            className="bg-card rounded-2xl border shadow-sm px-6 md:px-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            {faqData.map((item, index) => (
              <FAQItem key={index} question={item.question} answer={item.answer} />
            ))}
          </motion.div>
          
          <motion.div 
            className="mt-12 text-center bg-muted/50 rounded-2xl p-8 border"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
             <p className="text-foreground font-medium mb-2">Still have questions?</p>
             <p className="text-muted-foreground text-sm mb-6">We're happy to help. Chat with our team.</p>
             <a href="mailto:support@ollieinvoice.com" className="inline-flex items-center justify-center px-6 py-2.5 border shadow-sm text-sm font-medium rounded-full text-foreground bg-card hover:bg-muted transition-colors">
                Contact Support
             </a>
          </motion.div>
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
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8"
          >
            <Sparkles size={14} />
            <span>Join 2,000+ freelancers today</span>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-heading font-semibold mb-6 tracking-tight leading-tight"
          >
            Ready to look more professional?
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
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
            <Button size="lg" className="rounded-full px-12 h-14 text-lg w-full sm:w-auto" asChild>
              <a href="/login" data-testid="button-final-cta" onClick={() => trackCTAClicked('pricing_page')}>
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
            className="text-sm text-muted-foreground mt-6"
          >
            Includes 3 free invoices every month.
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

