import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { trackSignupStarted, trackSignupCompleted, trackLogin } from "@/lib/analytics";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Google icon component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

  // Handle Google sign-in
  const handleGoogleSignIn = async () => {
    if (!supabase) {
      toast({
        title: "Error",
        description: "Authentication is not configured.",
        variant: "destructive",
      });
      return;
    }

    // Track based on whether we're on signup or login form
    if (isSignUp) {
      trackSignupStarted('google');
    } else {
      trackLogin('google');
    }

    setGoogleLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

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

    trackLogin('email');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Note: Welcome message is only shown after actual account creation (via completeSignup)
      // We don't show it on regular logins to avoid showing it on every device/browser

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

    trackSignupStarted('email');
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
        
        // Track signup completed (email confirmation pending)
        trackSignupCompleted('email', !!data.company);
        
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
      console.error('Signup error:', error);
      
      let errorMessage = error.message || error.error_description || "Failed to create account";
      
      // Handle specific error cases
      if (error.message?.includes('User already registered')) {
        errorMessage = "This email is already registered. Please sign in instead.";
      } else if (error.message?.includes('Email rate limit exceeded')) {
        errorMessage = "Too many signup attempts. Please try again in a few minutes.";
      } else if (error.status === 500 || error.message?.includes('500')) {
        errorMessage = "Email service configuration error. Please contact support.";
      } else if (!error.message && Object.keys(error).length === 0) {
        errorMessage = "Connection error. Please check your internet and try again.";
      }
      
      toast({
        title: "Signup Error",
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
                  <strong>Tip:</strong> Check your spam folder if you don't see it within 1-2 minutes.
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

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 font-medium"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <GoogleIcon className="h-5 w-5 mr-2" />
              )}
              Continue with Google
            </Button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
              </div>
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
                  disabled={loading || googleLoading}
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

          <Button
            type="button"
            variant="outline"
            className="w-full h-11 font-medium"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <GoogleIcon className="h-5 w-5 mr-2" />
            )}
            Continue with Google
          </Button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
            </div>
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
              disabled={loading || googleLoading}
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
