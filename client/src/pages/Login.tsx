import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Ollie Invoice logo URL
const OLLIE_LOGO_URL = "https://fdqnjninitbyeescipyh.supabase.co/storage/v1/object/public/Logos/private/uploads/Ollie%20Circles.svg";

// Signup Schema - simplified with full name
const signupSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  company: z.string().min(1, "Company name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignupData = z.infer<typeof signupSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

  const signupForm = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      company: "",
      email: "",
      password: "",
    },
  });

  // Handle regular login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supabase) {
      toast({
        title: "Error",
        description: "Authentication is not configured.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if this is a new user (no business set up yet) for welcome message
      const isNewUser = localStorage.getItem(`ollie_welcomed_${data.user?.id}`) !== 'true';
      
      if (isNewUser && data.user) {
        localStorage.setItem(`ollie_welcomed_${data.user.id}`, 'true');
        localStorage.setItem('ollie_show_welcome', 'true');
      }

      toast({
        title: "Welcome back!",
        description: "Logged in successfully.",
      });
      
      // Force a full page navigation to ensure auth state is properly loaded
      window.location.href = "/dashboard";
    } catch (error: any) {
      let message = error.message || "An error occurred";
      
      if (message.includes("Email not confirmed")) {
        message = "Please verify your email before signing in. Check your inbox for the confirmation link.";
      }
      
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle signup
  const handleSignup = async (data: SignupData) => {
    if (!supabase) {
      toast({
        title: "Error",
        description: "Authentication is not configured.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create Supabase auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          // Use production URL for redirect
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            full_name: data.fullName,
            company_name: data.company,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      // If email confirmation is required, show verification message
      if (authData.user && !authData.session) {
        // Store signup data to create business after email verification
        localStorage.setItem('ollie_pending_signup', JSON.stringify({
          fullName: data.fullName,
          company: data.company,
          email: data.email,
        }));
        
        setVerificationEmail(data.email);
        setShowVerificationMessage(true);
        return;
      }

      // If no email confirmation required (shouldn't happen with your setup)
      if (authData.user && authData.session) {
        await completeSignup(authData.user.id, data, authData.session.access_token);
        
        toast({
          title: "Account created!",
          description: "Welcome to Ollie Invoice.",
        });
        
        setLocation("/dashboard");
      }
    } catch (error: any) {
      let errorMessage = error.message || "Failed to create account";
      
      if (error.message?.includes('User already registered')) {
        errorMessage = "This email is already registered. Please sign in instead.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Complete signup after email verification
  const completeSignup = async (userId: string, data: { fullName: string; company: string; email: string }, token: string) => {
    const response = await fetch('/api/auth/signup-complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        fullName: data.fullName,
        businessData: {
          businessName: data.company,
          email: data.email,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to complete account setup');
    }
    
    // Mark as new user for welcome message
    localStorage.setItem(`ollie_welcomed_${userId}`, 'true');
    localStorage.setItem('ollie_show_welcome', 'true');
  };

  // Verification message screen
  if (showVerificationMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="text-center space-y-5">
              {/* Animated envelope icon */}
              <div className="relative mx-auto w-16 h-16">
                <div className="absolute inset-0 bg-[#2CA01C]/20 rounded-full animate-ping" />
                <div className="relative flex items-center justify-center w-16 h-16 bg-[#2CA01C]/10 rounded-full">
                  <Mail className="h-8 w-8 text-[#2CA01C]" />
                </div>
              </div>
              
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
                <p className="text-muted-foreground text-sm">
                  We've sent a verification link to
                </p>
                <p className="font-medium text-foreground">{verificationEmail}</p>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
                <p>Click the link in the email to verify your account, then come back here to sign in.</p>
                <p className="text-xs">
                  <strong>Tip:</strong> Check your spam folder if you don't see it within 30 seconds.
                </p>
              </div>
              
              <div className="pt-2 space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowVerificationMessage(false);
                    setIsSignUp(false);
                    setEmail(verificationEmail);
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to sign in
                </Button>
                
                <p className="text-xs text-muted-foreground">
                  Didn't receive the email?{" "}
                  <button
                    onClick={() => {
                      setShowVerificationMessage(false);
                      setIsSignUp(true);
                    }}
                    className="text-[#2CA01C] hover:underline"
                  >
                    Try again
                  </button>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Signup form
  if (isSignUp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl">
          <CardContent className="pt-6 pb-6 px-8">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img 
                src={OLLIE_LOGO_URL} 
                alt="Ollie Invoice" 
                className="h-8 w-auto"
              />
            </div>
            
            <div className="text-center mb-5">
              <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
              <p className="text-muted-foreground text-sm mt-1">Start sending professional invoices in minutes</p>
            </div>

            <Form {...signupForm}>
              <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-3">
                <FormField
                  control={signupForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="John Smith" 
                          className="h-10"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signupForm.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Acme Inc." 
                          className="h-10"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signupForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="you@company.com" 
                          className="h-10"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signupForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          className="h-10"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full h-10 bg-[#2CA01C] hover:bg-[#238516] text-white mt-1" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-5 text-center text-sm">
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <button
                  onClick={() => {
                    setIsSignUp(false);
                    signupForm.reset();
                  }}
                  className="text-[#2CA01C] hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            </div>
            
            <div className="mt-3 text-center">
              <Link href="/" className="text-sm text-muted-foreground hover:underline">
                ← Back to home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Login form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardContent className="pt-6 pb-6 px-8">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img 
              src={OLLIE_LOGO_URL} 
              alt="Ollie Invoice" 
              className="h-8 w-auto"
            />
          </div>
          
          <div className="text-center mb-5">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                className="h-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="h-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-10 bg-[#2CA01C] hover:bg-[#238516] text-white mt-1" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm">
            <p className="text-muted-foreground">
              Don't have an account?{" "}
              <button
                onClick={() => setIsSignUp(true)}
                className="text-[#2CA01C] hover:underline font-medium"
              >
                Sign up
              </button>
            </p>
          </div>
          
          <div className="mt-3 text-center">
            <Link href="/" className="text-sm text-muted-foreground hover:underline">
              ← Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
