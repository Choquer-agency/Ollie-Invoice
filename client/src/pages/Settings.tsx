import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Building2, Upload, CreditCard, Banknote, CheckCircle2, ExternalLink, Plus, Pencil, Trash2, Percent } from "lucide-react";
import type { Business, TaxType } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";

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

  const { data: business, isLoading } = useQuery<Business | null>({
    queryKey: ["/api/business"],
  });

  const { data: taxTypes, isLoading: taxTypesLoading } = useQuery<TaxType[]>({
    queryKey: ["/api/tax-types"],
  });

  const [taxTypeDialogOpen, setTaxTypeDialogOpen] = useState(false);
  const [editingTaxType, setEditingTaxType] = useState<TaxType | undefined>();

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
    },
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

  useEffect(() => {
    if (business) {
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

  const stripeConnected = !!business?.stripeAccountId;

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
          <h1 className="text-2xl font-bold" data-testid="text-settings-title">Settings</h1>
          <p className="text-muted-foreground">Manage your business profile and preferences</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
            {/* Business Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
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
                  <Avatar className="h-20 w-20">
                    <AvatarImage 
                      src={business?.logoUrl ? (business.logoUrl.startsWith('/objects/') ? business.logoUrl : business.logoUrl) : undefined} 
                      className="object-cover" 
                    />
                    <AvatarFallback className="text-xl">
                      {business?.businessName?.[0] || "B"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium mb-1">Business Logo</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      Recommended: Square image, at least 200x200px
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
                      onComplete={async (uploadURL) => {
                        try {
                          await apiRequest("PUT", "/api/business/logo", { logoURL: uploadURL });
                          queryClient.invalidateQueries({ queryKey: ["/api/business"] });
                          toast({ title: "Logo uploaded successfully" });
                        } catch (error) {
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

            {/* Invoice Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Settings</CardTitle>
                <CardDescription>
                  Default settings for your invoices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem className="max-w-xs">
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <CardTitle className="flex items-center gap-2">
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
                <CardTitle className="flex items-center gap-2">
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
                    <div className="ml-8 p-4 bg-muted/50 rounded-lg">
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

                {/* Credit Card Toggle */}
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
                            data-testid="switch-card"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {acceptCard && (
                    <div className="ml-8 p-4 bg-muted/50 rounded-lg space-y-4">
                      {stripeConnected ? (
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-emerald-500/20">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-emerald-700 dark:text-emerald-400">
                              Stripe Connected
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Your Stripe account is connected and ready to accept payments
                            </p>
                          </div>
                          <Badge variant="secondary">Active</Badge>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Connect your Stripe account to start accepting credit card payments on your invoices.
                          </p>
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
                            data-testid="button-connect-stripe"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Connect Stripe Account
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

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
