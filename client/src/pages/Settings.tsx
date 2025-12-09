import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Upload, CreditCard, Banknote, CheckCircle2, ExternalLink, Plus, Pencil, Trash2, Percent, AlertCircle, Loader2, Mail, Sparkles, Crown, FileText, DollarSign, Calendar } from "lucide-react";
import type { Business, TaxType } from "@shared/schema";
import { Progress } from "@/components/ui/progress";

interface UsageData {
  tier: 'free' | 'pro';
  count: number;
  limit: number;
  canSend: boolean;
  resetDate: string | null;
}

interface SubscriptionDetails {
  hasSubscription: boolean;
  status?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string | null;
}
import { ObjectUploader } from "@/components/ObjectUploader";
import { FEATURES } from "@/lib/featureFlags";
import { supabase } from "@/lib/supabase";

interface StripeStatus {
  configured: boolean;
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  error?: string;
}

const businessFormSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  currency: z.string().default("USD"),
  acceptEtransfer: z.boolean().default(false),
  acceptCard: z.boolean().default(false),
  etransferEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  etransferInstructions: z.string().optional(),
  paymentInstructions: z.string().optional(),
  sendInvoiceCopy: z.boolean().default(false),
  invoiceCopyEmail: z.string().email("Invalid email").optional().or(z.literal("")),
});

type BusinessFormData = z.infer<typeof businessFormSchema>;

const taxTypeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  rate: z.string().min(1, "Rate is required"),
  isDefault: z.boolean().default(false),
});

type TaxTypeFormData = z.infer<typeof taxTypeFormSchema>;

const currencies = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "AUD", label: "AUD - Australian Dollar" },
];

export default function Settings() {
  const { toast } = useToast();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const stripeStatus = searchParams.get('stripe');

  const { data: business, isLoading } = useQuery<Business | null>({
    queryKey: ["/api/business"],
  });

  const { data: taxTypes, isLoading: taxTypesLoading } = useQuery<TaxType[]>({
    queryKey: ["/api/tax-types"],
  });

  // Query Stripe connection status
  const { data: stripeData, isLoading: stripeLoading, refetch: refetchStripeStatus } = useQuery<StripeStatus>({
    queryKey: ["/api/stripe/status"],
    enabled: !!business,
  });

  // Query subscription usage
  const { data: subscriptionUsage } = useQuery<UsageData>({
    queryKey: ["/api/subscription/usage"],
  });
  
  // Query subscription details (billing date, cancel status)
  const { data: subscriptionDetails, refetch: refetchSubscriptionDetails } = useQuery<SubscriptionDetails>({
    queryKey: ["/api/stripe/subscription-details"],
    enabled: subscriptionUsage?.tier === 'pro',
  });

  const [taxTypeDialogOpen, setTaxTypeDialogOpen] = useState(false);
  const [editingTaxType, setEditingTaxType] = useState<TaxType | undefined>();
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);

  // Handle Stripe status URL params
  useEffect(() => {
    // Refresh session when returning from Stripe to ensure auth is valid
    const refreshSession = async () => {
      if (supabase && (stripeStatus || searchParams.get('subscription'))) {
        try {
          await supabase.auth.refreshSession();
        } catch (e) {
          // Session refresh failed, but we'll continue - the auth hook will handle this
          console.log('Session refresh attempted');
        }
      }
    };
    refreshSession();
    
    if (stripeStatus === 'success') {
      toast({ title: "Stripe account connected successfully!" });
      refetchStripeStatus();
      queryClient.invalidateQueries({ queryKey: ["/api/business"] });
      window.history.replaceState({}, '', '/settings');
    } else if (stripeStatus === 'refresh') {
      toast({ 
        title: "Stripe setup incomplete", 
        description: "Please complete your Stripe account setup.",
        variant: "destructive" 
      });
      window.history.replaceState({}, '', '/settings');
    }
    
    // Handle subscription status
    const subscriptionStatus = searchParams.get('subscription');
    if (subscriptionStatus === 'success') {
      toast({ title: "Welcome to Pro! 🎉", description: "You now have unlimited invoices and all Pro features." });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/usage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stripe/subscription-details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/business"] });
      window.history.replaceState({}, '', '/settings');
    } else if (subscriptionStatus === 'canceled') {
      toast({ 
        title: "Upgrade canceled", 
        description: "No worries! You can upgrade anytime.",
      });
      window.history.replaceState({}, '', '/settings');
    }
  }, [stripeStatus, toast, refetchStripeStatus, searchParams]);

  // Stripe Connect mutation
  const connectStripeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/stripe/connect");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to connect Stripe", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
      setIsConnectingStripe(false);
    },
  });

  // Stripe Disconnect mutation
  const disconnectStripeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/stripe/disconnect");
    },
    onSuccess: () => {
      toast({ title: "Stripe account disconnected" });
      refetchStripeStatus();
      queryClient.invalidateQueries({ queryKey: ["/api/business"] });
    },
    onError: () => {
      toast({ title: "Failed to disconnect Stripe", variant: "destructive" });
    },
  });

  // Resume onboarding mutation
  const resumeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/stripe/onboarding-link");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to resume setup", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const handleConnectStripe = () => {
    setIsConnectingStripe(true);
    connectStripeMutation.mutate();
  };

  const handleUpgradeToPro = async () => {
    setIsUpgrading(true);
    try {
      const response = await apiRequest("POST", "/api/stripe/create-subscription-checkout");
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast({
        title: "Failed to start upgrade",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      setIsUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsManagingSubscription(true);
    try {
      const response = await apiRequest("GET", "/api/stripe/customer-portal");
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast({
        title: "Failed to open billing portal",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      setIsManagingSubscription(false);
    }
  };

  const form = useForm<BusinessFormData>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: {
      businessName: "",
      email: "",
      phone: "",
      address: "",
      website: "",
      currency: "USD",
      acceptEtransfer: false,
      acceptCard: false,
      etransferEmail: "",
      etransferInstructions: "",
      paymentInstructions: "",
      sendInvoiceCopy: false,
      invoiceCopyEmail: "",
    },
    values: business ? {
      businessName: business.businessName || "",
      email: business.email || "",
      phone: business.phone || "",
      address: business.address || "",
      website: business.website || "",
      currency: business.currency || "USD",
      acceptEtransfer: (business as any).acceptEtransfer || false,
      acceptCard: (business as any).acceptCard || false,
      etransferEmail: business.etransferEmail || "",
      etransferInstructions: business.etransferInstructions || "",
      paymentInstructions: (business as any).paymentInstructions || "",
      sendInvoiceCopy: (business as any).sendInvoiceCopy || false,
      invoiceCopyEmail: (business as any).invoiceCopyEmail || "",
    } : undefined,
  });

  const taxTypeForm = useForm<TaxTypeFormData>({
    resolver: zodResolver(taxTypeFormSchema),
    defaultValues: {
      name: "",
      rate: "",
      isDefault: false,
    },
  });

  const acceptEtransfer = form.watch("acceptEtransfer");
  const acceptCard = form.watch("acceptCard");
  const sendInvoiceCopy = form.watch("sendInvoiceCopy");

  useEffect(() => {
    if (business) {
      console.log('Business data loaded:', {
        businessName: business.businessName,
        logoUrl: business.logoUrl,
        hasLogo: !!business.logoUrl,
        currency: business.currency,
        phone: business.phone,
        address: business.address
      });
      form.reset({
        businessName: business.businessName || "",
        email: business.email || "",
        phone: business.phone || "",
        address: business.address || "",
        website: business.website || "",
        currency: business.currency || "USD",
        acceptEtransfer: (business as any).acceptEtransfer || false,
        acceptCard: (business as any).acceptCard || false,
        etransferEmail: business.etransferEmail || "",
        etransferInstructions: business.etransferInstructions || "",
        paymentInstructions: (business as any).paymentInstructions || "",
        sendInvoiceCopy: (business as any).sendInvoiceCopy || false,
        invoiceCopyEmail: (business as any).invoiceCopyEmail || "",
      });
    }
  }, [business, form]);

  const createTaxTypeMutation = useMutation({
    mutationFn: async (data: TaxTypeFormData) => {
      await apiRequest("POST", "/api/tax-types", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tax-types"] });
      toast({ title: "Tax type added" });
      setTaxTypeDialogOpen(false);
      taxTypeForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to add tax type", variant: "destructive" });
    },
  });

  const updateTaxTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TaxTypeFormData }) => {
      await apiRequest("PATCH", `/api/tax-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tax-types"] });
      toast({ title: "Tax type updated" });
      setTaxTypeDialogOpen(false);
      setEditingTaxType(undefined);
      taxTypeForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to update tax type", variant: "destructive" });
    },
  });

  const deleteTaxTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tax-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tax-types"] });
      toast({ title: "Tax type deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete tax type", variant: "destructive" });
    },
  });

  const openTaxTypeDialog = (taxType?: TaxType) => {
    if (taxType) {
      setEditingTaxType(taxType);
      taxTypeForm.reset({
        name: taxType.name,
        rate: taxType.rate,
        isDefault: taxType.isDefault || false,
      });
    } else {
      setEditingTaxType(undefined);
      taxTypeForm.reset({ name: "", rate: "", isDefault: false });
    }
    setTaxTypeDialogOpen(true);
  };

  const handleTaxTypeSubmit = (data: TaxTypeFormData) => {
    if (editingTaxType) {
      updateTaxTypeMutation.mutate({ id: editingTaxType.id, data });
    } else {
      createTaxTypeMutation.mutate(data);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: BusinessFormData) => {
      if (business) {
        await apiRequest("PATCH", "/api/business", data);
      } else {
        await apiRequest("POST", "/api/business", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business"] });
      toast({ title: "Settings saved" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  // Stripe Connect status
  const stripeConfigured = stripeData?.configured;
  const stripeConnected = stripeData?.connected && stripeData?.chargesEnabled;
  const stripePartiallyConnected = stripeData?.connected && !stripeData?.chargesEnabled;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[400px]" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-heading" data-testid="text-settings-title">Settings</h1>
          <p className="text-muted-foreground">Manage your business profile and preferences</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
            {/* Business Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-lg">
                  <Building2 className="h-5 w-5" />
                  Business Profile
                </CardTitle>
                <CardDescription>
                  This information will appear on your invoices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Logo upload */}
                <div className="flex items-center gap-4">
                  <div className="h-20 w-32 flex items-center justify-center border rounded-lg bg-background overflow-hidden">
                    {business?.logoUrl ? (
                      <img 
                        src={business.logoUrl} 
                        alt="Business logo" 
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          console.error('Logo failed to load:', business.logoUrl);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full w-full text-3xl font-bold text-muted-foreground">
                        {business?.businessName?.[0] || "B"}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Business Logo</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      Recommended: Square image, at least 200x200px. PNG or JPEG only, max 5MB.
                    </p>
                    <ObjectUploader
                      maxFileSize={5242880}
                      allowedFileTypes={["image/*"]}
                      title="Upload Business Logo"
                      onGetUploadParameters={async () => {
                        const res = await apiRequest("POST", "/api/objects/upload");
                        const data = await res.json();
                        return { method: "PUT" as const, url: data.uploadURL };
                      }}
                      onComplete={async (uploadURL, file) => {
                        try {
                          // Convert upload URL to public URL immediately
                          const publicURL = uploadURL.replace('/upload/sign/', '/public/');
                          
                          // Optimistically update the cache with the new logo URL
                          queryClient.setQueryData(["/api/business"], (old: any) => {
                            if (old) {
                              return { ...old, logoUrl: publicURL };
                            }
                            return old;
                          });
                          
                          // Save to server
                          const response = await apiRequest("PUT", "/api/business/logo", { logoURL: uploadURL });
                          const result = await response.json();
                          
                          // Update cache with the actual response from server
                          queryClient.setQueryData(["/api/business"], (old: any) => {
                            if (old) {
                              return { ...old, logoUrl: result.logoUrl };
                            }
                            return old;
                          });
                          
                          // Force a refetch to ensure we have the latest data
                          await queryClient.refetchQueries({ queryKey: ["/api/business"] });
                          
                          toast({ title: "Logo uploaded successfully" });
                        } catch (error) {
                          // Revert optimistic update on error
                          queryClient.invalidateQueries({ queryKey: ["/api/business"] });
                          toast({ title: "Failed to save logo", variant: "destructive" });
                        }
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </ObjectUploader>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Business Name" {...field} data-testid="input-business-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="business@example.com" {...field} data-testid="input-business-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} data-testid="input-business-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://yourbusiness.com" {...field} data-testid="input-business-website" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="123 Main St, City, State, ZIP" {...field} data-testid="input-business-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Subscription Plan */}
            <Card id="subscription">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-lg">
                  {subscriptionUsage?.tier === 'pro' ? (
                    <Crown className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                  Subscription Plan
                </CardTitle>
                <CardDescription>
                  Manage your subscription and billing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Plan */}
                <div className={`rounded-xl border-2 p-5 ${
                  subscriptionUsage?.tier === 'pro' 
                    ? 'border-amber-500/50 bg-amber-500/5' 
                    : 'border-border bg-muted/30'
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-semibold">
                          {subscriptionUsage?.tier === 'pro' ? 'Pro Plan' : 'Free Plan'}
                        </h3>
                        {subscriptionUsage?.tier === 'pro' && (
                          <Badge className="bg-amber-500 hover:bg-amber-600">
                            <Crown className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {subscriptionUsage?.tier === 'pro' 
                          ? 'Unlimited invoices, recurring billing, custom branding, and more.'
                          : '3 invoices per month with essential features to get started.'}
                      </p>
                      
                      {/* Usage for free plan */}
                      {subscriptionUsage?.tier === 'free' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <FileText className="h-4 w-4" />
                              Invoices this month
                            </span>
                            <span className={`font-medium ${
                              subscriptionUsage.count >= subscriptionUsage.limit 
                                ? 'text-red-500' 
                                : subscriptionUsage.count >= subscriptionUsage.limit - 1
                                  ? 'text-amber-500'
                                  : 'text-foreground'
                            }`}>
                              {subscriptionUsage.count} / {subscriptionUsage.limit}
                            </span>
                          </div>
                          <Progress 
                            value={(subscriptionUsage.count / subscriptionUsage.limit) * 100} 
                            className={`h-2 ${
                              subscriptionUsage.count >= subscriptionUsage.limit 
                                ? '[&>div]:bg-red-500' 
                                : subscriptionUsage.count >= subscriptionUsage.limit - 1
                                  ? '[&>div]:bg-amber-500'
                                  : ''
                            }`}
                          />
                          {subscriptionUsage.resetDate && (
                            <p className="text-xs text-muted-foreground">
                              {subscriptionUsage.count >= subscriptionUsage.limit 
                                ? 'Limit reached. ' 
                                : `${subscriptionUsage.limit - subscriptionUsage.count} invoice${subscriptionUsage.limit - subscriptionUsage.count !== 1 ? 's' : ''} remaining. `}
                              Resets on {new Date(subscriptionUsage.resetDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}.
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Pro features list */}
                      {subscriptionUsage?.tier === 'pro' && (
                        <>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {['Unlimited invoices', 'Recurring billing', 'Custom branding', 'Automated reminders'].map((feature) => (
                              <span key={feature} className="inline-flex items-center gap-1 text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full">
                                <CheckCircle2 className="h-3 w-3" />
                                {feature}
                              </span>
                            ))}
                          </div>
                          
                          {/* Billing details */}
                          {subscriptionDetails?.hasSubscription && (
                            <div className="mt-4 pt-4 border-t border-amber-500/20 space-y-2">
                              {subscriptionDetails.cancelAtPeriodEnd ? (
                                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4" />
                                  Subscription ends on {new Date(subscriptionDetails.currentPeriodEnd!).toLocaleDateString('en-US', { 
                                    month: 'long', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </p>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  Next billing date: {new Date(subscriptionDetails.currentPeriodEnd!).toLocaleDateString('en-US', { 
                                    month: 'long', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {subscriptionUsage?.tier === 'pro' ? '$10' : '$0'}
                      </div>
                      <div className="text-sm text-muted-foreground">/month</div>
                    </div>
                  </div>
                </div>

                {/* Upgrade/Downgrade Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {subscriptionUsage?.tier === 'free' ? (
                    <>
                      <Button 
                        className="flex-1 gap-2" 
                        onClick={handleUpgradeToPro}
                        disabled={isUpgrading}
                      >
                        {isUpgrading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {isUpgrading ? 'Redirecting...' : 'Upgrade to Pro — $10/mo'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={handleManageSubscription}
                        disabled={isManagingSubscription}
                      >
                        {isManagingSubscription ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Manage Subscription
                      </Button>
                    </>
                  )}
                </div>

                {/* What's included in Pro */}
                {subscriptionUsage?.tier === 'free' && (
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-3">What's included in Pro:</h4>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {[
                        'Unlimited invoices',
                        'Recurring invoices',
                        'Custom branding',
                        'Automated reminders',
                        'Priority email support',
                        'Advanced analytics',
                      ].map((feature) => (
                        <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-[#2CA01C]" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoice Settings Section Header */}
            <div className="pt-4">
              <h2 className="text-2xl font-bold font-heading">Invoice Settings</h2>
              <p className="text-muted-foreground">Default settings for your invoices</p>
            </div>

            {/* Currency */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-lg">
                  <DollarSign className="h-5 w-5" />
                  Currency
                </CardTitle>
                <CardDescription>
                  Set the default currency for your invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem className="max-w-xs">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-currency">
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
              </CardContent>
            </Card>

            {/* Tax Types */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 font-heading text-lg">
                    <Percent className="h-5 w-5" />
                    Tax Types
                  </CardTitle>
                  <CardDescription>
                    Configure tax types like GST, PST, or Tax Exempt for your line items
                  </CardDescription>
                </div>
                <Button onClick={() => openTaxTypeDialog()} data-testid="button-add-tax-type">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tax Type
                </Button>
              </CardHeader>
              <CardContent>
                {taxTypesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                  </div>
                ) : !taxTypes || taxTypes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No tax types configured yet.</p>
                    <p className="text-sm">Add tax types like GST, PST, or Tax Exempt to apply to your invoice line items.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {taxTypes.map((taxType) => (
                      <div
                        key={taxType.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                        data-testid={`row-tax-type-${taxType.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-medium">{taxType.name}</div>
                            <div className="text-sm text-muted-foreground">{taxType.rate}%</div>
                          </div>
                          {taxType.isDefault && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openTaxTypeDialog(taxType)}
                            data-testid={`button-edit-tax-type-${taxType.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTaxTypeMutation.mutate(taxType.id)}
                            data-testid={`button-delete-tax-type-${taxType.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-lg">
                  <CreditCard className="h-5 w-5" />
                  Payment Settings
                </CardTitle>
                <CardDescription>
                  Configure how your clients can pay invoices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* E-Transfer Toggle */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
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
                            data-testid="switch-etransfer"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {acceptEtransfer && (
                    <div className="ml-0 sm:ml-8 p-4 bg-muted/50 rounded-lg">
                      <FormField
                        control={form.control}
                        name="etransferEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-Transfer Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="payments@yourbusiness.com" 
                                {...field} 
                                data-testid="input-etransfer-email" 
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

                {/* Credit Card Toggle - Hidden when Stripe is disabled */}
                {FEATURES.STRIPE_ENABLED && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="acceptCard"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <FormLabel className="font-medium">Credit Card</FormLabel>
                              <p className="text-sm text-muted-foreground">
                                Accept credit card payments via Stripe
                              </p>
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={!stripeConnected}
                              data-testid="switch-card"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {(acceptCard || stripeConnected || stripePartiallyConnected) && (
                    <div className="ml-0 sm:ml-8 p-4 bg-muted/50 rounded-lg space-y-4">
                      {stripeLoading ? (
                        <div className="flex items-center gap-3">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Checking Stripe status...</p>
                        </div>
                      ) : stripeConnected ? (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-[#2CA01C]/20">
                              <CheckCircle2 className="h-5 w-5 text-[#2CA01C]" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-[#2CA01C]">
                                Stripe Connected
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Your Stripe account is connected. Payments go directly to your account.
                              </p>
                            </div>
                            <Badge variant="secondary">Active</Badge>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button 
                              type="button" 
                              variant="outline"
                              size="sm"
                              onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Stripe Dashboard
                            </Button>
                            <Button 
                              type="button" 
                              variant="ghost"
                              size="sm"
                              onClick={() => disconnectStripeMutation.mutate()}
                              disabled={disconnectStripeMutation.isPending}
                            >
                              Disconnect
                            </Button>
                          </div>
                        </>
                      ) : stripePartiallyConnected ? (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-amber-500/20">
                              <AlertCircle className="h-5 w-5 text-amber-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-amber-700 dark:text-amber-400">
                                Setup Incomplete
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Please complete your Stripe account setup to start accepting payments.
                              </p>
                            </div>
                            <Badge variant="outline">Pending</Badge>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button 
                              type="button" 
                              onClick={() => resumeOnboardingMutation.mutate()}
                              disabled={resumeOnboardingMutation.isPending}
                            >
                              {resumeOnboardingMutation.isPending && (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              )}
                              Complete Setup
                            </Button>
                            <Button 
                              type="button" 
                              variant="ghost"
                              size="sm"
                              onClick={() => disconnectStripeMutation.mutate()}
                              disabled={disconnectStripeMutation.isPending}
                            >
                              Cancel
                            </Button>
                          </div>
                        </>
                      ) : stripeConfigured ? (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Connect your Stripe account to start accepting credit card payments. Payments will go directly to your Stripe account.
                          </p>
                          <Button 
                            type="button" 
                            onClick={handleConnectStripe}
                            disabled={isConnectingStripe || connectStripeMutation.isPending}
                          >
                            {(isConnectingStripe || connectStripeMutation.isPending) ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Connect Stripe Account
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-amber-500/20">
                            <AlertCircle className="h-5 w-5 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-amber-700 dark:text-amber-400">
                              Stripe Not Available
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Stripe payments are not configured on this platform.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                )}

                {/* Payment Instructions */}
                <div className="pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="paymentInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Instructions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Include the invoice number in the payment memo. Payment is due within 30 days..." 
                            {...field} 
                            data-testid="input-payment-instructions"
                          />
                        </FormControl>
                        <FormDescription>
                          General instructions that will appear on all invoices
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Invoice Copy Notification */}
                <div className="pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="sendInvoiceCopy"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-3">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <FormLabel className="font-medium">Receive Invoice Copies</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Get a copy of every invoice you send
                            </p>
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-invoice-copy"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {sendInvoiceCopy && (
                    <div className="ml-0 sm:ml-8 p-4 bg-muted/50 rounded-lg mt-4">
                      <FormField
                        control={form.control}
                        name="invoiceCopyEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Copy Email Address</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="you@yourbusiness.com" 
                                {...field} 
                                data-testid="input-invoice-copy-email" 
                              />
                            </FormControl>
                            <FormDescription>
                              Email address where you'll receive copies of sent invoices
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-settings">
                {mutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Tax Type Dialog */}
      <Dialog open={taxTypeDialogOpen} onOpenChange={setTaxTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTaxType ? "Edit Tax Type" : "Add Tax Type"}</DialogTitle>
          </DialogHeader>
          <Form {...taxTypeForm}>
            <form onSubmit={taxTypeForm.handleSubmit(handleTaxTypeSubmit)} className="space-y-4">
              <FormField
                control={taxTypeForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., GST, PST, Tax Exempt" {...field} data-testid="input-tax-type-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={taxTypeForm.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-tax-type-rate" />
                    </FormControl>
                    <FormDescription>
                      Enter 0 for Tax Exempt items
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={taxTypeForm.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-tax-type-default"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Set as default tax type</FormLabel>
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setTaxTypeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTaxTypeMutation.isPending || updateTaxTypeMutation.isPending} data-testid="button-submit-tax-type">
                  {createTaxTypeMutation.isPending || updateTaxTypeMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
