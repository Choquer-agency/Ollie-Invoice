import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Building2, Crown, AlertCircle, Save } from "lucide-react";
import type { Business } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const businessFormSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  currency: z.string().default("USD"),
});

type BusinessFormData = z.infer<typeof businessFormSchema>;

const currencies = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
];

export default function AdminSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check admin status
  const { data: adminStatus, isLoading: isLoadingAdmin } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/status"],
    queryFn: () => apiRequest("GET", "/api/admin/status"),
  });

  // Get Ollie business if it exists
  const { data: ollieBusiness, isLoading: isLoadingBusiness } = useQuery<Business>({
    queryKey: ["/api/admin/ollie-business"],
    queryFn: () => apiRequest("GET", "/api/admin/ollie-business"),
    enabled: adminStatus?.isAdmin === true,
  });

  const form = useForm<BusinessFormData>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: {
      businessName: ollieBusiness?.businessName || "Ollie Invoice",
      email: ollieBusiness?.email || "",
      phone: ollieBusiness?.phone || "",
      address: ollieBusiness?.address || "",
      website: ollieBusiness?.website || "",
      currency: ollieBusiness?.currency || "USD",
    },
  });

  // Update form when business data loads
  useState(() => {
    if (ollieBusiness) {
      form.reset({
        businessName: ollieBusiness.businessName,
        email: ollieBusiness.email || "",
        phone: ollieBusiness.phone || "",
        address: ollieBusiness.address || "",
        website: ollieBusiness.website || "",
        currency: ollieBusiness.currency,
      });
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: BusinessFormData) =>
      apiRequest("POST", "/api/admin/ollie-business", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ollie-business"] });
      toast({
        title: "Success",
        description: "Ollie business created successfully",
      });
      setLocation("/admin");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create Ollie business",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: BusinessFormData) =>
      apiRequest("PATCH", "/api/admin/ollie-business", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ollie-business"] });
      toast({
        title: "Success",
        description: "Ollie business updated successfully",
      });
      setLocation("/admin");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Ollie business",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BusinessFormData) => {
    if (ollieBusiness) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoadingAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!adminStatus?.isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Alert variant="destructive" className="max-w-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You do not have permission to access the admin setup.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <Crown className="h-8 w-8 text-[#2CA01C]" />
            <h1 className="text-3xl font-bold tracking-tight">
              {ollieBusiness ? "Edit Ollie Business" : "Setup Ollie Business"}
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Configure your business information for invoicing customers
          </p>
        </div>

        <Alert>
          <Building2 className="h-4 w-4" />
          <AlertTitle>About Ollie Business</AlertTitle>
          <AlertDescription>
            This is your Ollie Invoice business profile. When customers subscribe to Pro, invoices will be automatically generated from this business to their account.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>
              Enter your business details as you want them to appear on invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ollie Invoice" {...field} />
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
                        <Input type="email" placeholder="hello@ollieinvoice.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Contact email shown on invoices
                      </FormDescription>
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
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="123 Main St, Suite 100, San Francisco, CA 94102" 
                          {...field} 
                        />
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
                        <Input type="url" placeholder="https://ollieinvoice.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {ollieBusiness ? "Update" : "Create"} Business
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/admin")}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}


