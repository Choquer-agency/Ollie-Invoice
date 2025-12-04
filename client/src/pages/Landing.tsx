import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  Star
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Create in Seconds",
    description: "Build professional invoices with our streamlined editor. Add line items, set due dates, and preview instantly.",
  },
  {
    icon: Send,
    title: "Send Instantly",
    description: "Email invoices directly or share with a magic link. Your clients get notified immediately.",
  },
  {
    icon: CreditCard,
    title: "Get Paid Faster",
    description: "Accept payments via Stripe checkout or e-transfer. One-click payment for your clients.",
  },
  {
    icon: BarChart3,
    title: "Track Everything",
    description: "Dashboard shows paid, unpaid, and overdue amounts at a glance. Never lose track of payments.",
  },
  {
    icon: Clock,
    title: "Recurring Invoices",
    description: "Set up monthly invoices that send automatically. Perfect for retainer clients.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "No bloat, no complexity. Just the features you need to invoice and get paid.",
  },
];

const steps = [
  {
    number: "1",
    title: "Create Invoice",
    description: "Add your client, line items, and due date. Takes 10 seconds.",
  },
  {
    number: "2",
    title: "Send or Share",
    description: "Email directly or copy a shareable payment link.",
  },
  {
    number: "3",
    title: "Get Paid",
    description: "Clients pay via Stripe checkout. You get notified instantly.",
  },
];

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Freelance Designer",
    quote: "I switched from QuickBooks and never looked back. This is exactly what I needed - nothing more, nothing less.",
  },
  {
    name: "Mike Rodriguez",
    role: "HVAC Contractor",
    quote: "I can send an invoice from my truck in 30 seconds. My customers pay the same day. Game changer.",
  },
  {
    name: "Emma Chen",
    role: "Marketing Consultant",
    quote: "The cleanest invoicing tool I've ever used. My clients love how easy it is to pay.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary">
              <Receipt className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Invoice</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <a href="/api/login" data-testid="link-login">Log in</a>
            </Button>
            <Button asChild>
              <a href="/api/login" data-testid="link-signup">Get Started</a>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 md:py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <Zap className="h-4 w-4" />
            The simplest invoicing tool ever built
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Send invoices fast.
            <br />
            <span className="text-primary">Get paid faster.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Create and send professional invoices in seconds. Accept payments via Stripe. 
            Built for small businesses who want simplicity, not complexity.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-base px-8" asChild>
              <a href="/api/login" data-testid="button-hero-start">
                Start Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8" asChild>
              <a href="#features" data-testid="button-hero-learn">Learn More</a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            No credit card required. Free forever for basic use.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-muted-foreground text-lg">Three simple steps to get paid</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-bold flex items-center justify-center mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              No bloat, no complexity. Just the features small businesses actually use.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover-elevate">
                <CardContent className="p-6">
                  <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Loved by small businesses</h2>
            <p className="text-muted-foreground text-lg">Join thousands who've simplified their invoicing</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed mb-4">"{testimonial.quote}"</p>
                  <div>
                    <p className="font-medium text-sm">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple pricing</h2>
            <p className="text-muted-foreground text-lg">Start free, upgrade when you need more</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <Card>
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-2">Free</h3>
                <p className="text-muted-foreground text-sm mb-6">For getting started</p>
                <div className="text-4xl font-bold mb-6">
                  $0<span className="text-lg font-normal text-muted-foreground">/mo</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {["5 invoices per month", "Stripe payments", "Email sending", "PDF generation", "Client management"].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/api/login">Get Started</a>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-primary relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-2">Pro</h3>
                <p className="text-muted-foreground text-sm mb-6">For growing businesses</p>
                <div className="text-4xl font-bold mb-6">
                  $10<span className="text-lg font-normal text-muted-foreground">/mo</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {["Unlimited invoices", "Recurring invoices", "Custom branding", "Priority support", "Automated reminders", "Multiple payment options"].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" asChild>
                  <a href="/api/login">Start Free Trial</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to simplify your invoicing?</h2>
          <p className="text-primary-foreground/80 text-lg mb-8">
            Join thousands of small businesses who've ditched complex software for something that just works.
          </p>
          <Button size="lg" variant="secondary" className="text-base px-8" asChild>
            <a href="/api/login">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary">
              <Receipt className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">Invoice</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built for small businesses. Simple, fast, beautiful.
          </p>
        </div>
      </footer>
    </div>
  );
}
