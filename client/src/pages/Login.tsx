import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Upload, ArrowRight, ArrowLeft, CheckCircle2, Building2, DollarSign, CreditCard, Banknote, Percent, Plus, Pencil, Trash2 } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

// Step 1 Schema - Personal & Business Info
const step1Schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  company: z.string().min(1, "Company name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Step 2 Schema - Business Settings
const step2Schema = z.object({
  currency: z.string().min(1, "Currency is required"),
  phone: z.string().min(1, "Phone number is required"),
  billingAddress: z.string().min(1, "Billing address is required"),
  taxTypes: z.array(z.object({
    name: z.string().min(1, "Tax name is required"),
    rate: z.string().min(1, "Tax rate is required"),
    isDefault: z.boolean().default(false),
  })).min(1, "At least one tax type is required"),
});

// Step 3 Schema - Payment Options (all optional)
const step3Schema = z.object({
  acceptEtransfer: z.boolean().default(false),
  etransferEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  acceptCard: z.boolean().default(false),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

const currencies = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "AUD", label: "AUD - Australian Dollar" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Multi-step signup state
  const [signupStep, setSignupStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  // Tax management state - start empty, user must add tax types
  const [taxTypes, setTaxTypes] = useState<Array<{ id: string; name: string; rate: string; isDefault: boolean }>>([]);
  const [taxDialogOpen, setTaxDialogOpen] = useState(false);
  const [editingTaxIndex, setEditingTaxIndex] = useState<number | null>(null);
  const [tempTax, setTempTax] = useState({ name: "", rate: "", isDefault: false });

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      company: "",
      email: "",
      password: "",
    },
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      currency: "USD",
      phone: "",
      billingAddress: "",
      taxTypes: [],
    },
  });

  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      acceptEtransfer: false,
      etransferEmail: "",
      acceptCard: false,
    },
  });

  const acceptEtransfer = step3Form.watch("acceptEtransfer");
  const acceptCard = step3Form.watch("acceptCard");

  // Handle regular login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supabase) {
      toast({
        title: "Error",
        description: "Supabase is not configured. Please check your environment variables.",
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

      toast({
        title: "Success",
        description: "Logged in successfully!",
      });
      // Small delay to ensure auth state is updated
      setTimeout(() => {
        setLocation("/dashboard");
      }, 100);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Create account and user profile
  const handleStep1Submit = async (data: Step1Data) => {
    if (!supabase) {
      toast({
        title: "Error",
        description: "Supabase is not configured.",
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
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
          },
        },
      });

      if (authError) {
        console.error('Supabase signup error:', authError);
        throw authError;
      }

      // If email confirmation is required and no session, ask user to confirm
      if (authData.user && !authData.session) {
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation email. Please confirm your email and then sign in to continue setup.",
        });
        setIsSignUp(false);
        setLogoUrl(null);
        setLogoPreview(null);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        throw new Error("Failed to create user account");
      }

      const newUserId = authData.user.id;

      // Use the special signup completion endpoint that doesn't require token validation
      // This works around the issue where tokens aren't immediately valid after signup
      const signupResponse = await fetch('/api/auth/signup-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: newUserId,
          firstName: data.firstName,
          lastName: data.lastName,
          businessData: {
            businessName: data.company,
            email: data.email,
            // Phone and address will be added in step 2
          },
          logoURL: logoUrl || undefined,
        }),
      });

      if (!signupResponse.ok) {
        const errorText = await signupResponse.text();
        throw new Error(`Failed to complete signup: ${errorText}`);
      }

      const { business } = await signupResponse.json();

      console.log('Signup successful, moving to step 2');
      setStep1Data(data);
      setUserId(newUserId);
      setBusinessId(business.id);
      setSignupStep(2);
    } catch (error: any) {
      console.error('Signup error:', error);
      let errorMessage = error.message || "Failed to create account";
      
      // Handle common Supabase errors
      if (error.message?.includes('User already registered')) {
        errorMessage = "This email is already registered. Please sign in instead.";
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = "Please enter a valid email address.";
      } else if (error.message?.includes('Password')) {
        errorMessage = "Password must be at least 6 characters long.";
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

  // Step 2: Set up currency, phone, address, and tax types
  const handleStep2Submit = async (data: Step2Data) => {
    if (!businessId || !userId) {
      toast({
        title: "Error",
        description: "Business not found. Please start over.",
        variant: "destructive",
      });
      return;
    }

    // Validate tax types
    const validTaxTypes = taxTypes.filter(t => t.name && t.rate);
    if (validTaxTypes.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one tax type",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const businessData = {
        currency: data.currency,
        phone: data.phone,
        address: data.billingAddress,
      };
      console.log('Submitting step 2 data:', businessData);
      
      // Use signup-complete endpoint to update business info (bypasses auth issues)
      const updateResponse = await fetch('/api/auth/signup-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: userId,
          updateBusiness: true,
          businessData,
          taxTypes: validTaxTypes.map(t => ({ name: t.name, rate: t.rate, isDefault: t.isDefault })),
        }),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Failed to save business settings: ${errorText}`);
      }

      setStep2Data(data);
      setSignupStep(3);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save business settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set up payment options (optional)
  const handleStep3Submit = async (data: Step3Data) => {
    if (!businessId || !userId) {
      toast({
        title: "Error",
        description: "Business not found. Please start over.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Use signup-complete endpoint to update payment settings (bypasses auth issues)
      const updateResponse = await fetch('/api/auth/signup-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: userId,
          updateBusiness: true,
          businessData: {
            acceptEtransfer: data.acceptEtransfer,
            acceptCard: data.acceptCard,
            etransferEmail: data.acceptEtransfer && data.etransferEmail ? data.etransferEmail : undefined,
          },
        }),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Failed to save payment settings: ${errorText}`);
      }

      toast({
        title: "Success",
        description: "Account setup complete! Welcome to Ollie Invoice.",
      });
      
      // Wait for session to be available and auth state to update
      // Give it time for Supabase to establish the session
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force a refresh of the auth state
      await supabase!.auth.getSession();
      
      // Redirect to dashboard - the router will handle auth state
      window.location.href = "/dashboard";
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save payment settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  // If signup, show multi-step wizard
  if (isSignUp) {
    console.log('Rendering signup wizard, step:', signupStep);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>
              Let's set up your account step by step
            </CardDescription>
            <div className="mt-4">
              <Progress value={(signupStep / 3) * 100} className="h-2" />
              <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                <span className={signupStep >= 1 ? "text-primary font-medium" : ""}>
                  Personal Info
                </span>
                <span className={signupStep >= 2 ? "text-primary font-medium" : ""}>
                  Business Settings
                </span>
                <span className={signupStep >= 3 ? "text-primary font-medium" : ""}>
                  Payment Options
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Step 1: Personal & Business Info */}
            {signupStep === 1 ? (
              <Form {...step1Form}>
                <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-4">
                  <div className="space-y-4">

                    {/* Logo Upload */}
                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
                      <div className="h-20 w-32 flex items-center justify-center border rounded-lg bg-background overflow-hidden">
                        {logoPreview ? (
                          <img 
                            src={logoPreview} 
                            alt="Business logo preview" 
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full w-full text-3xl font-bold text-muted-foreground">
                            {step1Form.watch("company")?.[0] || "L"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-1">Business Logo</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          This logo will appear on all your invoices. Recommended: Square image, at least 200x200px. PNG or JPEG only, max 5MB.
                        </p>
                        <ObjectUploader
                          maxFileSize={5242880}
                          allowedFileTypes={["image/png", "image/jpeg", "image/jpg"]}
                          title="Upload Business Logo"
                          onGetUploadParameters={async () => {
                            const res = await fetch("/api/objects/upload", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                            });
                            if (!res.ok) {
                              throw new Error("Failed to get upload URL");
                            }
                            const data = await res.json();
                            return { method: "PUT" as const, url: data.uploadURL };
                          }}
                          onComplete={(uploadURL, file) => {
                            setLogoUrl(uploadURL);
                            // Create a preview URL from the file
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setLogoPreview(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                            toast({
                              title: "Logo uploaded successfully",
                              description: "Your logo will be saved when you complete signup.",
                            });
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {logoUrl ? "Change Logo" : "Upload Logo"}
                        </ObjectUploader>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={step1Form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={step1Form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={step1Form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Your Company Inc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step1Form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="you@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step1Form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password *</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormDescription>
                            Must be at least 6 characters
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsSignUp(false);
                        setLogoUrl(null);
                        setLogoPreview(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Creating..." : "Continue"} <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </form>
              </Form>
            ) : null}

            {/* Step 2: Business Settings */}
            {signupStep === 2 ? (
              <>
                <Form {...step2Form}>
                  <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-4">
                    <div className="space-y-4">
                      <FormField
                        control={step2Form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="+1 (555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={step2Form.control}
                        name="billingAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Billing Address *</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="123 Main St, City, State, ZIP" 
                                {...field} 
                                rows={3}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={step2Form.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {currencies.map((currency) => (
                                  <SelectItem key={currency.value} value={currency.value}>
                                    {currency.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Tax Types */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Tax Types *</p>
                            <p className="text-xs text-muted-foreground">
                              Add tax types like GST, PST, or Tax Exempt
                            </p>
                          </div>
                          <Button 
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTempTax({ name: "", rate: "", isDefault: false });
                              setEditingTaxIndex(null);
                              setTaxDialogOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Tax Type
                          </Button>
                        </div>

                        {taxTypes.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground border rounded-lg">
                            <p>No tax types added yet.</p>
                            <p className="text-sm">Add at least one tax type to continue.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {taxTypes.map((tax, index) => (
                              <div
                                key={tax.id}
                                className="flex items-center justify-between p-3 rounded-lg border"
                              >
                                <div className="flex items-center gap-3">
                                  <div>
                                    <div className="font-medium">{tax.name || "Unnamed Tax"}</div>
                                    <div className="text-sm text-muted-foreground">{tax.rate}%</div>
                                  </div>
                                  {tax.isDefault && (
                                    <Badge variant="secondary">Default</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setTempTax({ ...tax });
                                      setEditingTaxIndex(index);
                                      setTaxDialogOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  {taxTypes.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        const newTaxes = taxTypes.filter((_, i) => i !== index);
                                        // Ensure at least one default
                                        if (tax.isDefault && newTaxes.length > 0) {
                                          newTaxes[0].isDefault = true;
                                        }
                                        setTaxTypes(newTaxes);
                                        step2Form.setValue("taxTypes", newTaxes);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSignupStep(1)}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>
                      <Button type="submit" disabled={loading || taxTypes.length === 0}>
                        {loading ? "Saving..." : "Continue"} <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </form>
                </Form>

                {/* Tax Type Dialog */}
                <Dialog open={taxDialogOpen} onOpenChange={setTaxDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingTaxIndex !== null ? "Edit Tax Type" : "Add Tax Type"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="tax-name">Tax Name *</Label>
                        <Input
                          id="tax-name"
                          placeholder="e.g., GST, PST, VAT"
                          value={tempTax.name}
                          onChange={(e) => setTempTax({ ...tempTax, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="tax-rate">Tax Rate (%) *</Label>
                        <Input
                          id="tax-rate"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={tempTax.rate}
                          onChange={(e) => setTempTax({ ...tempTax, rate: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Enter 0 for Tax Exempt
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={tempTax.isDefault}
                          onCheckedChange={(checked) => setTempTax({ ...tempTax, isDefault: checked })}
                        />
                        <Label>Set as default tax type</Label>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setTaxDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={() => {
                            if (!tempTax.name || !tempTax.rate) {
                              toast({
                                title: "Error",
                                description: "Please fill in all fields",
                                variant: "destructive",
                              });
                              return;
                            }

                            let newTaxes: typeof taxTypes;
                            if (editingTaxIndex !== null) {
                              // Update existing
                              newTaxes = [...taxTypes];
                              newTaxes[editingTaxIndex] = { ...tempTax, id: taxTypes[editingTaxIndex].id };
                            } else {
                              // Add new
                              newTaxes = [...taxTypes, { ...tempTax, id: Date.now().toString() }];
                            }

                            // If setting as default, unset others
                            if (tempTax.isDefault) {
                              const targetId = editingTaxIndex !== null 
                                ? newTaxes[editingTaxIndex].id 
                                : newTaxes[newTaxes.length - 1].id;
                              newTaxes = newTaxes.map(t => ({ ...t, isDefault: t.id === targetId }));
                            }

                            setTaxTypes(newTaxes);
                            step2Form.setValue("taxTypes", newTaxes);
                            setTaxDialogOpen(false);
                            setTempTax({ name: "", rate: "", isDefault: false });
                            setEditingTaxIndex(null);
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : null}

            {/* Step 3: Payment Options */}
            {signupStep === 3 ? (
              <Form {...step3Form}>
                <form onSubmit={step3Form.handleSubmit(handleStep3Submit)} className="space-y-4">
                  <div className="space-y-4">

                    <p className="text-sm text-muted-foreground mb-4">
                      You can set up payment methods now or add them later in Settings.
                    </p>

                    {/* E-Transfer Option */}
                    <div className="space-y-4">
                      <FormField
                        control={step3Form.control}
                        name="acceptEtransfer"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-3">
                              <Banknote className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <FormLabel className="font-medium">E-Transfer</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  Accept payments via e-transfer or bank transfer
                                </p>
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {acceptEtransfer && (
                        <div className="ml-8 p-4 bg-muted/50 rounded-lg">
                          <FormField
                            control={step3Form.control}
                            name="etransferEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>E-Transfer Email</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="email" 
                                    placeholder="payments@yourbusiness.com" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  Email address where clients can send e-transfers
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>

                    {/* Stripe Option */}
                    <div className="space-y-4">
                      <FormField
                        control={step3Form.control}
                        name="acceptCard"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-3">
                              <CreditCard className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <FormLabel className="font-medium">Credit Card (Stripe)</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  Accept credit card payments via Stripe
                                </p>
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {acceptCard && (
                        <div className="ml-8 p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-3">
                            You can connect your Stripe account after completing setup in Settings.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSignupStep(2)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Completing..." : "Complete Setup"} 
                      <CheckCircle2 className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </form>
              </Form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Regular login/signup toggle view
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSignUp ? "Create an account" : "Welcome back"}</CardTitle>
          <CardDescription>
            {isSignUp
              ? "Enter your email and password to create an account"
              : "Enter your email and password to sign in"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {isSignUp ? (
              <p>
                Already have an account?{" "}
                <button
                  onClick={() => {
                    setIsSignUp(false);
                    setSignupStep(1);
                    setTaxTypes([]);
                    setLogoUrl(null);
                    setLogoPreview(null);
                    step1Form.reset();
                    step2Form.reset();
                    step3Form.reset();
                  }}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{" "}
                <button
                  onClick={() => {
                    setIsSignUp(true);
                    setSignupStep(1);
                  }}
                  className="text-primary hover:underline"
                >
                  Sign up
                </button>
              </p>
            )}
          </div>
          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-muted-foreground hover:underline">
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
