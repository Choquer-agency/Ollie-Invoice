import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { motion, useMotionValue, useAnimationFrame } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { 
  FileText, 
  Send, 
  CreditCard, 
  BarChart3, 
  CheckCircle2, 
  ArrowRight,
  Palette,
  Hammer,
  Camera,
  Briefcase,
  PaintBucket,
  Code,
  RefreshCw,
  Receipt,
  Sparkles,
  Save,
  Mail,
  Link2,
  Activity,
  Building2,
  Users,
  DollarSign,
  Clock,
  Star
} from "lucide-react";

// Industry pills for hero section
const industries = [
  { icon: Palette, label: "Graphic Designer" },
  { icon: Hammer, label: "Contractor" },
  { icon: Camera, label: "Photographer" },
  { icon: Briefcase, label: "Consultant" },
  { icon: PaintBucket, label: "Painter" },
  { icon: Code, label: "Developer" },
];

// Rotating card content for hero
const heroCards = [
  {
    name: "Sarah Mitchell",
    title: "Logo Design",
    description: "Professional brand identity design for your business including logo, color palette, and guidelines.",
    amount: "$1,250.00",
    status: "Paid",
  },
  {
    name: "Mike Rodriguez",
    title: "Kitchen Renovation",
    description: "Complete kitchen remodel including cabinets, countertops, and appliance installation.",
    amount: "$8,500.00",
    status: "Pending",
  },
  {
    name: "Emma Chen",
    title: "Marketing Strategy",
    description: "Comprehensive Q4 marketing plan with social media, content, and advertising strategy.",
    amount: "$3,200.00",
    status: "Paid",
  },
  {
    name: "David Park",
    title: "Interior Painting",
    description: "Full interior painting for 3-bedroom home including prep work and premium paint.",
    amount: "$2,800.00",
    status: "Overdue",
  },
];

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

// Features for the 4-card grid
const benefitsFeatures = [
  {
    icon: CreditCard,
    title: "One-Click Payments",
    description: "Stripe integration for instant checkout. Clients pay with a single click.",
  },
  {
    icon: FileText,
    title: "Professional PDFs",
    description: "Auto-generated invoices ready to download or email to clients.",
  },
  {
    icon: Users,
    title: "Client Management",
    description: "Save client details and view complete invoice history.",
  },
  {
    icon: BarChart3,
    title: "Smart Dashboard",
    description: "Track paid, unpaid, and overdue invoices at a glance.",
  },
];

// Mini features for hover grid
const miniFeatures = [
  { icon: RefreshCw, title: "Recurring Invoices", description: "Set it once, auto-generate monthly" },
  { icon: Receipt, title: "Tax Management", description: "HST, GST, custom tax rates" },
  { icon: Sparkles, title: "Custom Branding", description: "Your logo, your colors" },
  { icon: Save, title: "Saved Items", description: "Reuse common line items" },
  { icon: Mail, title: "Email Delivery", description: "Send directly via email" },
  { icon: Link2, title: "Shareable Links", description: "Magic payment links" },
  { icon: Activity, title: "Payment Tracking", description: "Real-time status updates" },
  { icon: Building2, title: "E-Transfer Support", description: "Include payment instructions" },
];

// Testimonials
const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Freelance Designer",
    quote: "The cleanest invoicing tool I've ever used. My clients love how easy it is to pay.",
    avatar: "SM",
  },
  {
    name: "Mike Rodriguez",
    role: "HVAC Contractor",
    quote: "I can send an invoice from my truck in 30 seconds. My customers pay the same day.",
    avatar: "MR",
  },
  {
    name: "Emma Chen",
    role: "Marketing Consultant",
    quote: "I switched from QuickBooks and never looked back. This is exactly what I needed.",
    avatar: "EC",
  },
  {
    name: "David Park",
    role: "Photographer",
    quote: "Beautiful invoices that match my brand. Getting paid has never been this simple.",
    avatar: "DP",
  },
  {
    name: "Lisa Thompson",
    role: "Web Developer",
    quote: "Finally, an invoicing app that doesn't feel like accounting software. Love it!",
    avatar: "LT",
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

// Rotating Hero Card Component
function RotatingHeroCard() {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroCards.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  
  const card = heroCards[currentIndex];
  const statusColors: Record<string, string> = {
    Paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    Pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    Overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  
  return (
    <motion.div 
      className="bg-card border rounded-2xl p-6 shadow-notion w-full max-w-md"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
          {card.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <p className="font-medium text-sm">{card.name}</p>
          <p className="text-xs text-muted-foreground">{card.title}</p>
        </div>
      </div>
      
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {card.description}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-2xl font-semibold">{card.amount}</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[card.status]}`}>
            {card.status}
          </span>
        </div>
      </motion.div>
      
      {/* Progress dots */}
      <div className="flex gap-1.5 mt-4 justify-center">
        {heroCards.map((_, i) => (
          <div 
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentIndex ? "w-6 bg-primary" : "w-1.5 bg-muted"
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}

// Trusted By Logo Marquee Component
function TrustedByMarquee() {
  return (
    <div className="relative overflow-hidden py-8">
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

// Animated Invoice Mockup for How It Works
function AnimatedInvoiceMockup() {
  return (
    <div className="bg-muted/30 rounded-xl p-4 h-40 overflow-hidden relative">
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary/20 animate-pulse" />
          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-1.5 mt-3">
          <motion.div 
            className="h-2 bg-muted rounded"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1, delay: 0.2 }}
          />
          <motion.div 
            className="h-2 bg-muted rounded"
            initial={{ width: 0 }}
            animate={{ width: "80%" }}
            transition={{ duration: 1, delay: 0.4 }}
          />
          <motion.div 
            className="h-2 bg-muted rounded"
            initial={{ width: 0 }}
            animate={{ width: "60%" }}
            transition={{ duration: 1, delay: 0.6 }}
          />
        </div>
        <motion.div 
          className="absolute bottom-4 right-4 flex items-center gap-2"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 1 }}
        >
          <span className="text-xs font-medium text-primary">$1,250.00</span>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Animated Send Mockup
function AnimatedSendMockup() {
  return (
    <div className="bg-muted/30 rounded-xl p-4 h-40 overflow-hidden relative flex items-center justify-center">
      <motion.div
        className="relative"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center"
          animate={{ 
            x: [0, 60, 60],
            opacity: [1, 1, 0],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1,
          }}
        >
          <Send className="h-5 w-5 text-primary" />
        </motion.div>
        <motion.div
          className="absolute left-20 top-0 w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center"
          animate={{ 
            scale: [0, 1, 1],
            opacity: [0, 1, 1],
          }}
          transition={{ 
            duration: 2,
            delay: 0.8,
            repeat: Infinity,
            repeatDelay: 1,
          }}
        >
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        </motion.div>
      </motion.div>
    </div>
  );
}

// Animated Dashboard Mockup
function AnimatedDashboardMockup() {
  return (
    <div className="bg-muted/30 rounded-xl p-4 h-40 overflow-hidden">
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: "Paid", value: "$4,200", color: "text-green-500" },
          { label: "Pending", value: "$1,800", color: "text-yellow-500" },
          { label: "Overdue", value: "$320", color: "text-red-500" },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            className="bg-card rounded-lg p-2 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2 }}
          >
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            <motion.p 
              className={`text-sm font-semibold ${stat.color}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.2 }}
            >
              {stat.value}
            </motion.p>
          </motion.div>
        ))}
      </div>
      <div className="flex items-end gap-1 h-16">
        {[40, 65, 45, 80, 55, 70, 90].map((height, i) => (
          <motion.div
            key={i}
            className="flex-1 bg-primary/30 rounded-t"
            initial={{ height: 0 }}
            animate={{ height: `${height}%` }}
            transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
          />
        ))}
      </div>
    </div>
  );
}

// Testimonial Carousel Component
function TestimonialsCarousel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const x = useMotionValue(0);
  const baseVelocity = -0.5;
  
  useAnimationFrame((_, delta) => {
    if (isPaused) return;
    const moveBy = baseVelocity * (delta / 16);
    const currentX = x.get();
    const containerWidth = containerRef.current?.scrollWidth || 0;
    const halfWidth = containerWidth / 2;
    
    if (currentX <= -halfWidth) {
      x.set(0);
    } else {
      x.set(currentX + moveBy);
    }
  });
  
  return (
    <div 
      className="overflow-hidden cursor-grab active:cursor-grabbing"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <motion.div 
        ref={containerRef}
        className="flex gap-4"
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -1000, right: 0 }}
      >
        {[...testimonials, ...testimonials].map((testimonial, i) => (
          <motion.div
            key={i}
            className="flex-shrink-0 w-80 bg-card border rounded-2xl p-6 shadow-notion"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <blockquote className="text-sm leading-relaxed mb-4">
              "{testimonial.quote}"
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                {testimonial.avatar}
              </div>
              <div>
                <p className="font-medium text-sm">{testimonial.name}</p>
                <p className="text-xs text-muted-foreground">{testimonial.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

// Mini Feature Card with Hover
function MiniFeatureCard({ feature }: { feature: typeof miniFeatures[0] }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      className="relative p-4 rounded-xl border bg-card hover:shadow-notion-hover transition-all duration-200 cursor-default"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
          <feature.icon className="h-4 w-4 text-foreground" />
        </div>
        <span className="font-medium text-sm">{feature.title}</span>
      </div>
      <motion.p
        className="text-xs text-muted-foreground mt-2 overflow-hidden"
        initial={{ height: 0, opacity: 0 }}
        animate={{ 
          height: isHovered ? "auto" : 0, 
          opacity: isHovered ? 1 : 0 
        }}
        transition={{ duration: 0.2 }}
      >
        {feature.description}
      </motion.p>
    </motion.div>
  );
}

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

      {/* Hero Section */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24 px-6">
        <motion.div 
          className="max-w-6xl mx-auto"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
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
                Create and send professional invoices in seconds. Get paid faster with automatic online payment links.
              </motion.p>
              
              <motion.div className="flex flex-col sm:flex-row gap-3" variants={fadeIn}>
                <Button size="lg" className="rounded-full px-8" asChild>
                  <a href="/login" data-testid="button-hero-start">
                    Get Started Free
                  </a>
                </Button>
                <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
                  <a href="#how-it-works">
                    See How It Works
                  </a>
                </Button>
              </motion.div>
              
              <motion.p className="text-sm text-muted-foreground mt-4" variants={fadeIn}>
                No credit card required
              </motion.p>
              
              {/* Industry Pills */}
              <motion.div 
                className="flex flex-wrap gap-2 mt-10"
                variants={fadeIn}
              >
                {industries.map((industry, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1.5 bg-card border rounded-full text-sm"
                  >
                    <industry.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{industry.label}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Rotating Hero Card */}
            <motion.div 
              className="flex justify-center lg:justify-end"
              variants={fadeIn}
            >
              <RotatingHeroCard />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Trusted By Section */}
      <section className="py-12 border-y bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-sm text-muted-foreground mb-6">
            Trusted by growing companies around the world
          </p>
          <TrustedByMarquee />
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 md:py-28 px-6">
        <motion.div 
          className="max-w-6xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div className="text-center mb-16" variants={fadeIn}>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              How it works
            </span>
            <h2 className="text-3xl md:text-4xl font-medium mb-4">
              With Ollie, invoicing is easy
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
              Create professional invoices, send them instantly, and get paid faster. 
              All in three simple steps.
            </p>
            <Button className="rounded-full px-6" asChild>
              <a href="/login">Get Started</a>
            </Button>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Create in Seconds", description: "Build professional invoices with our streamlined editor. Add items, set dates, preview instantly.", MockupComponent: AnimatedInvoiceMockup },
              { step: "02", title: "Send & Get Paid", description: "Email invoices directly or share with a magic link. One-click payment for clients.", MockupComponent: AnimatedSendMockup },
              { step: "03", title: "Track Everything", description: "Dashboard shows paid, unpaid, and overdue at a glance. Never lose track.", MockupComponent: AnimatedDashboardMockup },
            ].map((item, index) => (
              <motion.div
                key={index}
                className="bg-card border rounded-2xl p-6 shadow-notion"
                variants={fadeIn}
              >
                <item.MockupComponent />
                <div className="mt-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                      {item.step}
                    </span>
                    <h3 className="text-lg font-medium">{item.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Benefits Grid Section */}
      <section className="py-20 md:py-28 px-6 bg-muted/30 border-y">
        <motion.div 
          className="max-w-6xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div className="text-center mb-12" variants={fadeIn}>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Benefits
            </span>
            <h2 className="text-3xl md:text-4xl font-medium mb-4">
              Your all-in-one invoicing solution
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover a variety of our advanced features. Unlimited and free for individuals.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {benefitsFeatures.map((feature, index) => (
              <motion.div
                key={index}
                className="bg-card border rounded-2xl p-6 shadow-notion hover-elevate"
                variants={fadeIn}
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* And So Much More Section */}
      <section className="py-20 md:py-28 px-6">
        <motion.div 
          className="max-w-6xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div className="text-center mb-12" variants={fadeIn}>
            <h2 className="text-2xl md:text-3xl font-medium mb-4">
              And so much more
            </h2>
            <p className="text-muted-foreground">
              We're constantly adding new features to help you get paid faster
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto"
            variants={fadeIn}
          >
            {miniFeatures.map((feature, index) => (
              <MiniFeatureCard key={index} feature={feature} />
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 md:py-28 px-6 bg-muted/30 border-y overflow-hidden">
        <motion.div 
          className="max-w-6xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div className="text-center mb-12" variants={fadeIn}>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Testimonials
            </span>
            <h2 className="text-3xl md:text-4xl font-medium mb-4">
              Don't just take our word for it
            </h2>
            <p className="text-muted-foreground">
              Our users are our best ambassadors. See what they have to say.
            </p>
          </motion.div>

          <motion.div variants={fadeIn}>
            <TestimonialsCarousel />
          </motion.div>
        </motion.div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-28 px-6">
        <motion.div 
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div className="text-center mb-12" variants={fadeIn}>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Pricing
            </span>
            <h2 className="text-3xl md:text-4xl font-medium mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-muted-foreground">
              Start free, upgrade when you need more
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto items-stretch">
            {/* Free Plan */}
            <motion.div 
              className="rounded-2xl p-6 md:p-8 border border-dashed border-[#2CA01C]/30 flex flex-col"
              style={{ backgroundColor: 'rgba(44, 160, 28, 0.05)' }}
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
              className="rounded-2xl p-6 md:p-8 relative border border-dashed flex flex-col"
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
          
          <motion.div className="text-center mt-8" variants={fadeIn}>
            <a href="/pricing" className="text-sm text-primary hover:underline">
              View full pricing comparison →
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-28 px-6 bg-muted/30 border-t">
        <motion.div 
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-medium mb-4">
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
