import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
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
  Menu,
  X,
  XCircle,
  Loader2,
  MousePointer2,
  Plus,
  TrendingUp,
  Bell,
  Paintbrush,
  Check
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
    title: "One Click Payments",
    description: "Accept payments instantly with our seamless Stripe integration. Each invoice generates a secure checkout link so your clients can pay in seconds. Faster payments mean smoother cash flow and less time chasing overdue invoices.",
  },
  {
    icon: FileText,
    title: "Professional PDFs",
    description: "Create beautiful, ready-to-send PDF invoices automatically—no formatting or design work required. Every invoice includes your branding, itemized details, taxes, and totals in a clean, professional layout. Download, print, or email them directly to clients with one click.",
  },
  {
    icon: Users,
    title: "Client Management",
    description: "Keep all your clients organized with a simple, built-in contact manager. Store names, emails, companies, and full invoice histories in one place for quick access. Whether you're billing a returning customer or reviewing past work, everything you need is right at your fingertips.",
  },
  {
    icon: BarChart3,
    title: "Smart Dashboard",
    description: "See the health of your business at a glance with real-time insights. Track paid, unpaid, and overdue invoices instantly so you always know where your money is. Your dashboard becomes a financial command center—clear, simple, and designed to keep you in control.",
  },
];

// Mini features for hover grid
const miniFeatures = [
  { icon: RefreshCw, title: "Recurring Invoices", description: "Automatically generate and send invoices on a schedule—perfect for retainers, subscriptions, and ongoing services." },
  { icon: Receipt, title: "Tax Management", description: "Apply the right taxes every time with support for HST, GST, PST, VAT, or fully custom tax rates tailored to your business." },
  { icon: Sparkles, title: "Custom Branding", description: "Make every invoice feel uniquely yours with your logo, colors, business details, and a clean professional layout." },
  { icon: Save, title: "Saved Items", description: "Save your most common line items so you can build new invoices in seconds with accurate pricing every time." },
  { icon: Mail, title: "Email Delivery", description: "Send invoices directly to your clients' inboxes with a single click, complete with payment options and a professional PDF." },
  { icon: Link2, title: "Shareable Links", description: "Generate secure, shareable invoice links your clients can open from any device for instant viewing and payment." },
  { icon: Activity, title: "Payment Tracking", description: "See payment activity in real time and always know whether an invoice is sent, viewed, paid, or overdue." },
  { icon: Building2, title: "E-Transfer Support", description: "Enable e-transfer as a payment method and automatically attach clear payment instructions to every invoice" },
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

// Stats data
const stats = [
  { label: "Invoices Sent", value: 10000, suffix: "+" },
  { label: "Money Processed", value: 2000000, prefix: "$", suffix: "+" },
  { label: "Hours Saved", value: 50000, suffix: "+" },
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

// Interactive Invoice Component for Hero
function InteractiveInvoice() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const runCycle = () => {
      if (step === 0) {
        timer = setTimeout(() => setStep(1), 3000);
      } else if (step === 1) {
        timer = setTimeout(() => setStep(2), 1500);
      } else if (step === 2) {
        timer = setTimeout(() => setStep(3), 2500);
      } else if (step === 3) {
        timer = setTimeout(() => setStep(4), 1500);
      } else if (step === 4) {
        timer = setTimeout(() => setStep(0), 3500);
      }
    };
    runCycle();
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <div className="relative w-full max-w-sm mx-auto group">
      {/* Decorative Glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-b from-border to-transparent rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition duration-1000"></div>
      
      {/* Main Card - Fixed height to prevent layout shift */}
      <div className="relative bg-card rounded-xl border shadow-2xl overflow-hidden h-[420px] flex flex-col font-sans transition-transform duration-500 hover:-translate-y-1">
        
        {/* Progress Bar */}
        <div className="h-1 bg-muted w-full overflow-hidden">
          <motion.div 
            className="h-full"
            initial={{ width: "0%" }}
            animate={{ 
              width: step === 0 ? "20%" : 
                     step === 1 ? "40%" : 
                     step === 2 ? "60%" : 
                     step === 3 ? "80%" : "100%",
              backgroundColor: step === 4 ? "#2CA01C" : "hsl(var(--foreground))"
            }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 flex flex-col relative">
          
          <AnimatePresence mode="wait">
            {/* STEP 0: DRAFT & STEP 1: SENDING */}
            {(step === 0 || step === 1) && (
              <motion.div
                key="draft"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-4 flex-1 flex flex-col"
              >
                {/* Header with Logo */}
                <div className="flex justify-between items-start border-b pb-4">
                  <div className="flex items-center gap-2">
                    <img 
                      src="https://fdqnjninitbyeescipyh.supabase.co/storage/v1/object/public/Logos/private/uploads/Client8.svg" 
                      alt="Pedigree Painting" 
                      className="h-6 w-auto"
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Invoice #0024</p>
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-3 flex-1">
                   {[
                     { name: "Exterior Prep & Wash", desc: "Power washing and sanding", price: "$850.00" },
                     { name: "Premium Exterior Paint", desc: "2 coats, Benjamin Moore", price: "$2,400.00" }
                   ].map((item, i) => (
                     <motion.div 
                        key={i}
                        className="flex justify-between items-start group/item hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded-md transition-colors"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + (i * 0.15) }}
                     >
                       <div>
                         <div className="text-sm font-medium">{item.name}</div>
                         <div className="text-xs text-muted-foreground">{item.desc}</div>
                       </div>
                       <span className="font-mono text-sm font-medium">{item.price}</span>
                     </motion.div>
                   ))}
                </div>

                {/* Footer Totals */}
                <div className="bg-muted/50 -mx-6 -mb-6 p-4 space-y-2 border-t">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Subtotal</span>
                    <span>$3,250.00</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Tax (13%)</span>
                    <span>$422.50</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-semibold text-sm">Total Due</span>
                    <span className="text-xl font-bold tracking-tight">$3,672.50</span>
                  </div>
                  <Button className="w-full mt-2 rounded-lg" size="sm" disabled={step === 1}>
                    {step === 1 ? (
                      <span className="flex items-center">
                        <Loader2 size={14} className="animate-spin mr-2" /> Sending...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        Send Invoice <Send size={14} className="ml-2 opacity-70" />
                      </span>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: SENT & STEP 3: PROCESSING */}
            {(step === 2 || step === 3) && (
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-center"
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-16 h-16 bg-blue-50 dark:bg-blue-950/30 rounded-full flex items-center justify-center mb-4 shadow-inner"
                >
                  <Send className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </motion.div>
                
                <h3 className="text-lg font-bold">Invoice Sent</h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-[180px]">
                  Shared with client@highland.com
                </p>
                
                <div className="mt-8 w-full max-w-xs mx-auto">
                  <div className="bg-card border shadow-lg rounded-xl p-4 text-left">
                    <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Total Due</div>
                    <div className="text-2xl font-bold mb-3 tracking-tight">$3,672.50</div>
                    
                    {step === 3 ? (
                      <button className="w-full py-2.5 bg-muted text-muted-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-2 cursor-wait">
                        <Loader2 size={14} className="animate-spin" /> Processing...
                      </button>
                    ) : (
                      <button className="w-full py-2.5 bg-foreground text-background rounded-lg text-sm font-medium flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-colors">
                         <CreditCard size={14} /> Pay with Card
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: PAID */}
            {step === 4 && (
              <motion.div
                key="paid"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-center"
              >
                <motion.div 
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4 shadow-sm"
                >
                  <CheckCircle2 className="w-10 h-10 text-[#2CA01C]" strokeWidth={3} />
                </motion.div>
                
                <h3 className="text-2xl font-bold tracking-tight">Paid</h3>
                <p className="text-muted-foreground mt-1 text-sm font-medium">Funds deposited successfully.</p>
                
                <div className="w-full bg-muted/50 rounded-xl p-4 mt-6 border border-dashed">
                  <div className="flex justify-between items-center border-b pb-2 mb-2">
                    <span className="text-xs text-muted-foreground">Transaction ID</span>
                    <span className="text-xs font-mono">#tr_8921a</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Amount</span>
                    <span className="text-sm font-bold text-[#2CA01C]">+$3,672.50</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Back glow for depth */}
      <div className="absolute inset-x-4 top-8 bottom-4 bg-foreground/5 rounded-[2rem] -z-10 blur-xl transform translate-y-4"></div>
    </div>
  );
}

// Trusted By Logo Marquee Component
function TrustedByMarquee() {
  const allLogos = [...trustedLogos, ...trustedLogos, ...trustedLogos];
  
  return (
    <div className="relative overflow-hidden py-4">
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
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Stats Counter Component
function StatsCounter({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  
  useEffect(() => {
    if (hasAnimated) return;
    
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        setHasAnimated(true);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value, hasAnimated]);
  
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(0)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
    return num.toString();
  };
  
  return (
    <span>{prefix}{formatNumber(count)}{suffix}</span>
  );
}

// Comparison Slider Component
function ComparisonSlider() {
  const [sliderPosition, setSliderPosition] = useState(50);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPosition(Number(e.target.value));
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto aspect-[16/9] md:aspect-[2/1] bg-muted rounded-2xl overflow-hidden shadow-2xl border">
      
      {/* AFTER IMAGE (Ollie) - Full Width underneath */}
      <div className="absolute inset-0 bg-card flex items-center justify-center">
         <div className="w-full h-full p-8 flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted/50">
            <div className="bg-card rounded-xl shadow-lg border p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                         <div className="w-8 h-8 bg-foreground rounded flex items-center justify-center text-background font-bold">O</div>
                         <span className="font-bold">Ollie Invoice</span>
                    </div>
                    <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-1 rounded-full font-medium">Paid</span>
                </div>
                <div className="space-y-2">
                    <div className="h-2 bg-muted rounded w-full"></div>
                    <div className="h-2 bg-muted rounded w-2/3"></div>
                    <div className="h-2 bg-muted rounded w-3/4"></div>
                </div>
                <div className="mt-6 flex justify-end">
                    <div className="text-2xl font-bold">$1,200.00</div>
                </div>
            </div>
            <div className="absolute bottom-8 right-8 flex items-center gap-2 bg-card/80 backdrop-blur px-4 py-2 rounded-full border shadow-sm">
               <CheckCircle2 className="text-[#2CA01C] w-5 h-5" />
               <span className="text-sm font-medium">Professional & Fast</span>
            </div>
         </div>
      </div>

      {/* BEFORE IMAGE (Spreadsheets) - Clipped on top */}
      <div 
        className="absolute inset-0 bg-muted border-r-4 border-background"
        style={{ width: `${sliderPosition}%`, overflow: 'hidden' }}
      >
         <div className="absolute inset-0 w-[100vw] max-w-5xl h-full flex items-center justify-center bg-muted">
            <div className="w-full h-full p-8 flex flex-col items-center justify-center grayscale opacity-60">
                 <div className="w-full max-w-md bg-card p-6 border shadow-sm rounded-none relative">
                    {/* Grid Lines mimicking excel */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                    <div className="relative z-10 space-y-4 font-mono text-xs">
                         <div className="flex gap-4 border-b pb-2">
                             <span>Row 1</span>
                             <span>Description..........</span>
                             <span>$$$</span>
                         </div>
                         <div className="flex gap-4">
                             <span>Row 2</span>
                             <span>Format_Error_#REF</span>
                             <span>???</span>
                         </div>
                         <div className="flex gap-4">
                             <span>Row 3</span>
                             <span>Printing...</span>
                             <span>...</span>
                         </div>
                    </div>
                 </div>
                 <div className="absolute bottom-8 left-8 flex items-center gap-2 bg-muted/80 backdrop-blur px-4 py-2 rounded-full border shadow-sm">
                    <XCircle className="text-muted-foreground w-5 h-5" />
                    <span className="text-sm font-medium text-muted-foreground">Manual & Messy</span>
                 </div>
            </div>
         </div>
      </div>

      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-background cursor-ew-resize z-20 shadow-[0_0_20px_rgba(0,0,0,0.2)]"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-card rounded-full shadow-lg flex items-center justify-center border">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground">
                <path d="M15 19L8 12L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 19L15 12L22 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
            </svg>
        </div>
      </div>

      {/* Invisible Range Input for Interaction */}
      <input
        type="range"
        min="0"
        max="100"
        value={sliderPosition}
        onChange={handleSliderChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
      />
    </div>
  );
}

// Animated Creation Mockup for How It Works
function AnimatedCreationMockup() {
  const [items, setItems] = useState([
    { desc: "Exterior Power Wash", price: "$450.00" }
  ]);
  const [cursorState, setCursorState] = useState("idle");

  useEffect(() => {
    const loop = async () => {
      setItems([{ desc: "Exterior Power Wash", price: "$450.00" }]);
      setCursorState("idle");
      await new Promise(r => setTimeout(r, 1000));

      setCursorState("moving");
      await new Promise(r => setTimeout(r, 800));
      setCursorState("clicking");
      await new Promise(r => setTimeout(r, 200));
      setCursorState("moving");
      setItems(prev => [...prev, { desc: "Deck Staining & Seal", price: "$1,200.00" }]);
      await new Promise(r => setTimeout(r, 1000));

      setCursorState("moving");
      await new Promise(r => setTimeout(r, 800));
      setCursorState("clicking");
      await new Promise(r => setTimeout(r, 200));
      setCursorState("moving");
      setItems(prev => [...prev, { desc: "Trim Painting", price: "$350.00" }]);
      
      await new Promise(r => setTimeout(r, 3000));
      loop();
    };
    loop();
  }, []);

  return (
    <div className="bg-muted/50 rounded-xl h-64 relative overflow-hidden border group font-sans select-none">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:24px_24px] opacity-[0.5]"></div>
      
      {/* Invoice Card */}
      <div className="absolute inset-4 bg-card rounded-lg shadow-sm border overflow-hidden flex flex-col">
         {/* Fake Header */}
         <div className="h-10 border-b flex items-center justify-between px-4 bg-muted/50 flex-shrink-0">
           <img 
             src="https://fdqnjninitbyeescipyh.supabase.co/storage/v1/object/public/Logos/private/uploads/Client8.svg" 
             alt="Pedigree Painting" 
             className="h-5 w-auto"
           />
           <div className="text-[10px] text-muted-foreground font-mono">INV-001</div>
         </div>
         
         {/* Column Headers */}
         <div className="flex justify-between px-4 py-2 bg-card border-b text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex-shrink-0">
            <span>Description</span>
            <span>Amount</span>
         </div>
         
         {/* Scrollable Content */}
         <div className="flex-1 px-4 py-2 overflow-hidden space-y-1 relative">
            <AnimatePresence initial={false}>
              {items.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0, opacity: 0, y: -10 }}
                  animate={{ height: "auto", opacity: 1, y: 0 }}
                  className="flex justify-between items-center py-1.5 border-b border-dashed last:border-0"
                >
                  <span className="text-xs font-medium truncate max-w-[120px]">{item.desc}</span>
                  <span className="text-xs font-mono text-muted-foreground">{item.price}</span>
                </motion.div>
              ))}
            </AnimatePresence>
         </div>
         
         {/* Footer - Fixed at bottom */}
         <div className="h-12 border-t flex items-center justify-between px-4 bg-muted/30 flex-shrink-0">
            {/* Add Row Button */}
            <div 
               className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                  ${cursorState === 'clicking' ? 'bg-foreground/80 scale-95' : 'bg-foreground'} text-background shadow-sm z-10
               `}
            >
               <Plus size={12} /> Add Row
            </div>

            {/* Total */}
            <div className="text-right">
                <span className="text-[10px] text-muted-foreground block leading-none mb-0.5">Total Due</span>
                <motion.span layout className="text-sm font-bold block leading-none">
                    ${items.reduce((acc, item) => acc + parseFloat(item.price.replace(/[^0-9.]/g, '')), 0).toLocaleString()}.00
                </motion.span>
            </div>
         </div>
         
         {/* Animated Cursor */}
         <motion.div
           className="absolute z-50 pointer-events-none"
           animate={{ 
             x: cursorState === 'idle' ? 150 : 35,
             y: cursorState === 'idle' ? 80 : 195,
             scale: cursorState === 'clicking' ? 0.9 : 1
           }}
           transition={{ duration: cursorState === 'moving' ? 0.8 : 0.1, ease: "easeInOut" }}
         >
           <MousePointer2 className="fill-foreground text-foreground h-5 w-5 drop-shadow-md" />
         </motion.div>
      </div>
    </div>
  );
}

// Animated Send Mockup for How It Works
function AnimatedSendMockup() {
  const [stage, setStage] = useState<"draft" | "sending" | "link" | "paying" | "paid">("draft");

  useEffect(() => {
    const runCycle = async () => {
       setStage("draft");
       await new Promise(r => setTimeout(r, 2000));
       
       setStage("sending");
       await new Promise(r => setTimeout(r, 1000));
       
       setStage("link");
       await new Promise(r => setTimeout(r, 2000));
       
       setStage("paying");
       await new Promise(r => setTimeout(r, 1500));
       
       setStage("paid");
       await new Promise(r => setTimeout(r, 3000));
       
       runCycle();
    };
    runCycle();
  }, []);

  return (
    <div className="bg-muted/50 rounded-xl h-64 relative overflow-hidden border flex items-center justify-center p-6 select-none">
      <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:20px_20px] opacity-50"></div>
      
      {/* Increased Width Container */}
      <div className="relative w-full max-w-[280px]">
        
        {/* The Card Container */}
        <div className="bg-card rounded-xl shadow-lg border overflow-hidden relative min-h-[140px] flex flex-col transition-all duration-500">
           
           {/* STAGE: DRAFT / SENDING */}
           <AnimatePresence mode="wait">
             {(stage === "draft" || stage === "sending") && (
                <motion.div 
                   key="draft-view"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="p-5 flex flex-col h-full"
                >
                   <div className="space-y-3 mb-5">
                      <div className="flex justify-between text-xs text-muted-foreground border-b pb-2">
                         <span>Subtotal</span><span>$450.00</span>
                      </div>
                      <div className="flex justify-between font-bold text-base">
                         <span>Total Due</span><span>$450.00</span>
                      </div>
                   </div>
                   <div className="mt-auto">
                      <div className={`
                         w-full h-10 rounded-lg bg-foreground text-background text-sm font-medium flex items-center justify-center gap-2 transition-all
                         ${stage === 'sending' ? 'opacity-80' : ''}
                      `}>
                         {stage === 'sending' ? (
                            <>Sending...</>
                         ) : (
                            <>Send Invoice <Send size={14} /></>
                         )}
                      </div>
                   </div>
                   
                   {/* Cursor for "Send" */}
                   {stage === 'draft' && (
                      <motion.div 
                         className="absolute bottom-3 right-1/2 z-20"
                         initial={{ opacity: 0, x: 80, y: 40 }}
                         animate={{ opacity: 1, x: 40, y: 0 }}
                         transition={{ delay: 0.5, duration: 1, ease: "easeInOut" }}
                      >
                         <MousePointer2 className="fill-foreground text-foreground h-6 w-6 drop-shadow-xl" />
                      </motion.div>
                   )}
                </motion.div>
             )}

             {/* STAGE: LINK / PAYING */}
             {(stage === "link" || stage === "paying") && (
                <motion.div 
                   key="link-view"
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -10 }}
                   className="p-5 flex flex-col items-center justify-center h-full text-center"
                >
                   <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-3">
                      <Link2 size={24} />
                   </div>
                   <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">Secure Link</div>
                   <div className="text-xs font-mono bg-muted px-3 py-1.5 rounded text-muted-foreground mb-5 border">
                      pay.ollie.co/inv-24
                   </div>
                   <div className={`
                      w-full h-10 rounded-lg bg-[#2CA01C] text-white text-sm font-medium flex items-center justify-center gap-2 shadow-sm transition-transform
                      ${stage === 'paying' ? 'scale-95' : ''}
                   `}>
                      Pay Now $450.00
                   </div>
                   
                   {/* Cursor for "Pay" */}
                   <motion.div 
                      className="absolute bottom-3 right-1/3 z-20"
                      initial={{ opacity: 0, x: 50, y: 30 }}
                      animate={{ opacity: 1, x: 10, y: -5 }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                   >
                      <MousePointer2 className="fill-foreground text-foreground h-6 w-6 drop-shadow-xl" />
                   </motion.div>
                </motion.div>
             )}

             {/* STAGE: PAID */}
             {stage === "paid" && (
                <motion.div 
                   key="paid-view"
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="p-5 flex flex-col items-center justify-center h-[180px] bg-green-50/50 dark:bg-green-950/20"
                >
                   <motion.div 
                     initial={{ scale: 0 }} 
                     animate={{ scale: 1 }}
                     transition={{ type: "spring" }}
                     className="w-16 h-16 bg-[#2CA01C] text-white rounded-full flex items-center justify-center mb-3 shadow-lg"
                   >
                      <CheckCircle2 size={32} strokeWidth={3} />
                   </motion.div>
                   <div className="text-lg font-bold">Paid</div>
                   <div className="text-xs text-muted-foreground">$450.00 via Credit Card</div>
                </motion.div>
             )}
           </AnimatePresence>

        </div>
      </div>
    </div>
  );
}

// Animated Tracking Mockup for How It Works
function AnimatedTrackingMockup() {
  const [count, setCount] = useState(1250);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => prev + 150);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-muted/50 rounded-xl h-64 relative overflow-hidden border flex flex-col items-center justify-center p-6 select-none">
      
      {/* Revenue Counter */}
      <div className="text-center mb-8 relative z-10">
        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Total Revenue</div>
        <div className="text-4xl font-bold tabular-nums tracking-tight">
           ${count.toLocaleString()}
        </div>
        <motion.div 
           key={count}
           className="text-xs font-bold text-[#2CA01C] flex items-center justify-center gap-1 mt-2 bg-green-50 dark:bg-green-950/30 py-1 px-2 rounded-full inline-flex"
           initial={{ opacity: 0, y: 5 }}
           animate={{ opacity: 1, y: 0 }}
        >
           <TrendingUp size={12} /> +$150.00
        </motion.div>
      </div>

      {/* Notification Stream */}
      <div className="w-full max-w-[240px] relative h-20">
         <AnimatePresence mode="popLayout">
            <motion.div
               key={count}
               initial={{ opacity: 0, y: 20, scale: 0.9 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               exit={{ opacity: 0, y: -20, scale: 0.95 }}
               className="bg-card p-3 rounded-lg border shadow-lg flex items-center gap-3 absolute w-full top-0 left-0 z-20"
            >
               <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <Bell size={14} className="text-green-700 dark:text-green-400" />
               </div>
               <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">Payment Received</div>
                  <div className="text-[10px] text-muted-foreground truncate">Stripe • Just now</div>
               </div>
            </motion.div>
         </AnimatePresence>
         
         {/* Stacked cards for depth */}
         <div className="bg-card p-3 rounded-lg border shadow-sm absolute w-full top-2 left-0 scale-[0.95] opacity-60 z-10">
            <div className="flex gap-3 opacity-0">...</div>
         </div>
         <div className="bg-card p-3 rounded-lg border shadow-sm absolute w-full top-4 left-0 scale-[0.9] opacity-30 z-0">
            <div className="flex gap-3 opacity-0">...</div>
         </div>
      </div>
    </div>
  );
}

// Mini Feature Card with hover
function MiniFeatureCard({ feature }: { feature: typeof miniFeatures[0] }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      className="bg-card border rounded-xl p-4 cursor-default shadow-notion"
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

// Brand colors for demo
const brandColors = [
  { name: 'Ollie Green', value: '#2CA01C', ring: 'ring-[#2CA01C]' },
  { name: 'Royal Blue', value: '#2563eb', ring: 'ring-blue-600' },
  { name: 'Violet', value: '#7c3aed', ring: 'ring-violet-600' },
  { name: 'Slate', value: '#18181b', ring: 'ring-gray-900' },
];

// Branding Demo Section Component
function BrandingDemo() {
  const [selectedColor, setSelectedColor] = useState(brandColors[0]);

  return (
    <section className="py-24 px-6 bg-muted/30 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
            >
              <Paintbrush size={14} />
              <span>Make it yours</span>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-5xl font-heading font-semibold mb-6 tracking-tight"
            >
              Brand your invoices in seconds.
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-lg text-muted-foreground mb-8 leading-relaxed"
            >
              Upload your logo, pick your brand color, and choose a font. 
              Ollie automatically applies your identity to every invoice, estimate, and email.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-card p-4 rounded-xl border shadow-sm inline-block"
            >
               <div className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Brand Color</div>
               <div className="flex gap-2">
                 {brandColors.map((color) => (
                   <button
                     key={color.name}
                     onClick={() => setSelectedColor(color)}
                     className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${selectedColor.value === color.value ? `ring-2 ring-offset-2 ${color.ring} ring-offset-background` : 'hover:scale-110'}`}
                     style={{ backgroundColor: color.value }}
                   >
                     {selectedColor.value === color.value && <Check size={10} className="text-white" />}
                   </button>
                 ))}
               </div>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            {/* Invoice Preview */}
            <div className="bg-card rounded-xl shadow-xl border overflow-hidden relative z-10">
               <div className="h-2 w-full transition-colors duration-300" style={{ backgroundColor: selectedColor.value }}></div>
               <div className="p-8">
                  <div className="flex justify-between items-start mb-8">
                     <div className="flex items-center gap-3">
                        <img 
                          src="https://fdqnjninitbyeescipyh.supabase.co/storage/v1/object/public/Logos/private/uploads/Client8.svg" 
                          alt="Pedigree Painting" 
                          className="h-8 w-auto"
                        />
                     </div>
                     <div className="text-right">
                        <div className="font-mono text-2xl font-bold">INVOICE</div>
                        <div className="text-sm text-muted-foreground">#001</div>
                     </div>
                  </div>
                  
                  <div className="space-y-4 mb-8">
                     <div className="h-8 bg-muted rounded w-full flex items-center px-4 justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Web Design</span>
                        <span className="text-xs font-bold">$2,400.00</span>
                     </div>
                     <div className="h-8 bg-muted rounded w-full flex items-center px-4 justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Maintenance</span>
                        <span className="text-xs font-bold">$150.00</span>
                     </div>
                  </div>
                  
                  <div className="flex justify-between items-center border-t pt-4">
                     <span className="text-sm text-muted-foreground">Total Due</span>
                     <span className="text-2xl font-bold transition-colors duration-300" style={{ color: selectedColor.value }}>$2,550.00</span>
                  </div>
               </div>
            </div>
            
            {/* Decorative BG */}
            <div className="absolute inset-0 bg-muted rounded-xl scale-[0.98] -z-10 translate-y-2"></div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-background/80 backdrop-blur-md border-b py-3' 
          : 'bg-transparent py-5'
      }`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center" data-testid="link-home">
              <img 
                src="https://fdqnjninitbyeescipyh.supabase.co/storage/v1/object/public/Logos/private/uploads/Ollie%20Invoice.svg" 
                alt="Ollie Invoice" 
                className="h-5 w-auto"
              />
            </Link>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />
              {isAuthenticated ? (
                <Button size="sm" className="rounded-full px-5" asChild>
                  <Link href="/dashboard" data-testid="link-dashboard">
                    Dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <a href="/login">Log in</a>
                  </Button>
                  <Button size="sm" className="rounded-full px-6" asChild>
                    <a href="/login" data-testid="link-signup">
                      Start for Free
                    </a>
                  </Button>
                </>
              )}
            </div>

            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle />
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-muted-foreground">
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b p-4 flex flex-col space-y-4 shadow-lg animate-in fade-in slide-in-from-top-2">
            <a href="#how-it-works" className="text-muted-foreground font-medium" onClick={() => setIsMobileMenuOpen(false)}>How it Works</a>
            <a href="#features" className="text-muted-foreground font-medium" onClick={() => setIsMobileMenuOpen(false)}>Features</a>
            <a href="#pricing" className="text-muted-foreground font-medium" onClick={() => setIsMobileMenuOpen(false)}>Pricing</a>
            <div className="pt-2 flex flex-col gap-2">
              <Button variant="ghost" className="w-full justify-start" asChild>
                <a href="/login">Log in</a>
              </Button>
              <Button className="w-full" asChild>
                <a href="/login">Start for Free</a>
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-24 px-6 overflow-hidden">
        {/* Animated Background Mesh */}
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl opacity-50 animate-pulse pointer-events-none"></div>
        <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] bg-blue-100/20 dark:bg-blue-900/10 rounded-full blur-3xl opacity-50 animate-pulse pointer-events-none" style={{ animationDelay: '1s' }}></div>
        
        <motion.div 
          className="max-w-6xl mx-auto relative z-10"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <div className="lg:grid lg:grid-cols-2 lg:gap-20 items-center">
            
            {/* Left Content */}
            <div className="text-center lg:text-left mb-16 lg:mb-0">
              <motion.div
                variants={fadeIn}
                className="inline-flex items-center px-3 py-1 rounded-full bg-muted border text-muted-foreground text-xs font-medium mb-6"
              >
                <span className="flex h-2 w-2 rounded-full bg-[#2CA01C] mr-2"></span>
                v2.0 Now Available
              </motion.div>

              <motion.h1 
                className="text-4xl sm:text-5xl lg:text-6xl font-heading font-semibold tracking-tight leading-[1.1] mb-6"
                variants={fadeIn}
              >
                Simple invoicing for small businesses.
              </motion.h1>
              
              <motion.p 
                className="text-lg sm:text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0"
                variants={fadeIn}
              >
                Stop wrestling with spreadsheets. Create and send professional invoices in seconds, and get paid 2x faster with automatic payments.
              </motion.p>
              
              <motion.div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6" variants={fadeIn}>
                <Button size="lg" className="w-full sm:w-auto px-10 text-lg h-14 rounded-full" asChild>
                  <a href="/login" data-testid="button-hero-start">
                    Start for Free
                  </a>
                </Button>
              </motion.div>

              <motion.p className="text-sm text-muted-foreground mb-8 flex items-center justify-center lg:justify-start gap-1" variants={fadeIn}>
                <CheckCircle2 className="h-4 w-4 text-[#2CA01C] mr-1" />
                No credit card required
              </motion.p>
              
              {/* Industry Pills */}
              <motion.div 
                className="flex flex-wrap justify-center lg:justify-start gap-2"
                variants={fadeIn}
              >
                {industries.map((industry, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1.5 bg-card border rounded-full text-xs font-medium text-muted-foreground hover:border-foreground/20 transition-colors cursor-default select-none"
                  >
                    <industry.icon className="h-3.5 w-3.5" />
                    <span>{industry.label}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right Content - Interactive Invoice */}
            <motion.div 
              className="flex justify-center lg:justify-end relative"
              variants={fadeIn}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-muted to-transparent rounded-full opacity-50 blur-3xl -z-10"></div>
              <InteractiveInvoice />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Trusted By Section */}
      <section className="py-8">
        <div className="max-w-6xl mx-auto px-6">
          {/* Top line - 70% width */}
          <div className="flex justify-center mb-6">
            <div className="w-[70%] h-px bg-border"></div>
          </div>
          <p className="text-center text-sm text-muted-foreground mb-4">
            Trusted by growing companies around the world
          </p>
          <TrustedByMarquee />
          {/* Bottom line - 70% width */}
          <div className="flex justify-center mt-6">
            <div className="w-[70%] h-px bg-border"></div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-background">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-border">
            {stats.map((stat, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center py-4"
              >
                <div className="text-4xl md:text-5xl font-heading font-semibold mb-2 tracking-tight">
                  <StatsCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                </div>
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-24 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-heading font-semibold mb-6">
              The difference is clear
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Stop wasting hours on manual formatting. See how Ollie transforms your workflow.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <ComparisonSlider />
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 md:py-32 px-6 bg-background relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4"
            >
              <Sparkles size={14} />
              How it works
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-5xl font-heading font-semibold mb-6 tracking-tight"
            >
              Invoicing made effortless
            </motion.h2>
            <motion.div 
               initial={{ opacity: 0 }}
               whileInView={{ opacity: 1 }}
               viewport={{ once: true }}
               transition={{ delay: 0.2 }}
               className="flex justify-center"
            >
              <Button className="rounded-full px-6" asChild>
                <a href="/login">
                  Start for Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create", description: "Add items, set prices, and customize your invoice in seconds using our intuitive editor.", Mockup: AnimatedCreationMockup },
              { step: "02", title: "Send", description: "Share a secure link via email or text. Clients can view and pay from any device.", Mockup: AnimatedSendMockup },
              { step: "03", title: "Track", description: "Watch your revenue grow in real-time. Get notified the moment you get paid.", Mockup: AnimatedTrackingMockup },
            ].map((item, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="group"
              >
                <item.Mockup />
                <div className="mt-8 px-2">
                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="text-xs font-bold text-muted-foreground font-mono">
                      {item.step}
                    </span>
                    <h3 className="text-xl font-semibold">{item.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Grid Section */}
      <section id="features" className="py-20 md:py-28 px-6 bg-muted/30 border-y">
        <motion.div 
          className="max-w-6xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div className="text-center mb-12" variants={fadeIn}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <CheckCircle2 size={14} />
              Benefits
            </span>
            <h2 className="text-3xl md:text-4xl font-heading font-semibold mb-4">
              Your all in one invoicing solution
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover a variety of our advanced features. Unlimited and free for individuals.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {benefitsFeatures.map((feature, index) => (
              <motion.div
                key={index}
                className="bg-card border rounded-2xl p-6 shadow-notion hover:-translate-y-1 transition-transform duration-300"
                variants={fadeIn}
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
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
            <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-4">
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

      {/* Branding Demo Section */}
      <BrandingDemo />

      {/* Testimonials Section */}
      <section className="py-20 md:py-28 px-6 bg-muted/30 border-y overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Users size={14} />
              Testimonials
            </span>
            <h2 className="text-3xl md:text-4xl font-heading font-semibold mb-4">
              Do not just take our word for it
            </h2>
            <p className="text-muted-foreground">
              Our users are our best ambassadors. See what they have to say.
            </p>
          </div>

          <div className="relative">
            <div className="flex animate-marquee gap-6 w-fit">
              {[...testimonials, ...testimonials].map((testimonial, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-80 bg-card border rounded-2xl p-6 shadow-notion hover:scale-105 transition-transform duration-300"
                >
                  <blockquote className="text-sm leading-relaxed mb-4 text-muted-foreground">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-medium">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <CreditCard size={14} />
              Pricing
            </span>
            <h2 className="text-3xl md:text-4xl font-heading font-semibold mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-muted-foreground">
              Start free, upgrade when you need more
            </p>
          </motion.div>
          
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
          
          <motion.div className="text-center mt-8" variants={fadeIn}>
            <a href="/pricing" className="text-sm text-primary hover:underline">
              View full pricing comparison →
            </a>
          </motion.div>
        </motion.div>
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
            className="text-sm text-muted-foreground mt-6"
          >
            Includes 5 free invoices every month.
          </motion.p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img 
                  src="https://fdqnjninitbyeescipyh.supabase.co/storage/v1/object/public/Logos/private/uploads/Ollie%20Invoice.svg" 
                  alt="Ollie Invoice" 
                  className="h-5 w-auto"
                />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Making invoicing simple for everyone.
              </p>
              <div className="text-sm text-muted-foreground/60">
                © 2024 Ollie Invoice.
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="/pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
