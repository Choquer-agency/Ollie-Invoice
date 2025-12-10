import { useState, useEffect } from "react";
import { useLocation, useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { SendInvoiceButton } from "@/components/SendInvoiceButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/formatters";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Trash2, CalendarIcon, Save, ArrowLeft, UserPlus, Repeat, Hash, Crown, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Client, Business, InvoiceWithRelations, SavedItem, TaxType } from "@shared/schema";
import { trackInvoiceCreated, trackInvoiceSent, trackFeatureUsed, trackUpgradeStarted } from "@/lib/analytics";

interface UsageData {
  tier: 'free' | 'pro';
  count: number;
  limit: number;
  canSend: boolean;
  resetDate: string | null;
}

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  rate: z.number().min(0, "Rate must be 0 or greater"),
  taxTypeId: z.string().optional(),
});

type LineItem = z.infer<typeof lineItemSchema> & { id: string; lineTotal: number };

const invoiceFormSchema = z.object({
  clientId: z.string().optional(),
  issueDate: z.date(),
  dueDate: z.date(),
  notes: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
  recurringDay: z.number().min(1).max(31).optional(),
  recurringMonth: z.number().min(1).max(12).optional(),
  recurringEvery: z.number().min(1).max(12).optional(),
});

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

function QuickAddClient({ onSuccess }: { onSuccess: (clientId: string) => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/clients", { 
        name, 
        companyName: companyName || undefined,
        email: email || undefined, 
        phone: phone || undefined 
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client added" });
      onSuccess(data.id);
      setOpen(false);
      setName("");
      setCompanyName("");
      setEmail("");
      setPhone("");
    },
    onError: () => {
      toast({ title: "Failed to add client", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" data-testid="button-quick-add-client">
          <UserPlus className="h-4 w-4 mr-2" />
          New Client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Label className="text-sm font-medium">Contact Name *</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="John Smith"
              data-testid="input-quick-client-name"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Company Name</Label>
            <Input 
              value={companyName} 
              onChange={(e) => setCompanyName(e.target.value)} 
              placeholder="Acme Corp"
              data-testid="input-quick-client-company"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Email</Label>
            <Input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="client@example.com"
              data-testid="input-quick-client-email"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Phone</Label>
            <Input 
              type="tel" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              placeholder="(555) 123-4567"
              data-testid="input-quick-client-phone"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => mutation.mutate()} 
              disabled={!name || mutation.isPending}
              data-testid="button-quick-save-client"
            >
              {mutation.isPending ? "Adding..." : "Add Client"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CreateInvoice() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isEditing = params.id && params.id !== "new";
  const { toast } = useToast();

  // Check for duplicate query parameter
  const searchParams = new URLSearchParams(window.location.search);
  const duplicateFromId = searchParams.get("duplicate");

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, rate: 0, taxTypeId: undefined, lineTotal: 0 },
  ]);

  const [shippingEnabled, setShippingEnabled] = useState(false);
  const [shippingCost, setShippingCost] = useState<number>(0);

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: business } = useQuery<Business | null>({
    queryKey: ["/api/business"],
  });

  const { data: taxTypes } = useQuery<TaxType[]>({
    queryKey: ["/api/tax-types"],
  });

  const { data: savedItems } = useQuery<SavedItem[]>({
    queryKey: ["/api/saved-items"],
  });

  const { data: subscriptionUsage } = useQuery<UsageData>({
    queryKey: ["/api/subscription/usage"],
  });

  const isPro = subscriptionUsage?.tier === 'pro';

  const getDefaultTaxTypeId = () => {
    if (!taxTypes || taxTypes.length === 0) return undefined;
    const defaultTaxType = taxTypes.find((t) => t.isDefault);
    return defaultTaxType?.id || taxTypes[0]?.id;
  };

  const { data: invoiceCount } = useQuery<{ count: number }>({
    queryKey: ["/api/invoices/count"],
  });

  const { data: existingInvoice, isLoading: invoiceLoading } = useQuery<InvoiceWithRelations>({
    queryKey: ["/api/invoices", params.id],
    enabled: !!isEditing,
  });

  // Fetch source invoice for duplication
  const { data: sourceInvoice, isLoading: sourceInvoiceLoading } = useQuery<InvoiceWithRelations>({
    queryKey: ["/api/invoices", duplicateFromId],
    enabled: !!duplicateFromId && !isEditing,
  });

  const nextInvoiceNumber = isEditing 
    ? existingInvoice?.invoiceNumber 
    : String((invoiceCount?.count || 0) + 1).padStart(4, '0');

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      clientId: "",
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: "",
      isRecurring: false,
      recurringFrequency: "monthly",
      recurringDay: 1,
      recurringMonth: 1,
      recurringEvery: 1,
    },
  });

  const isRecurring = form.watch("isRecurring");
  const recurringFrequency = form.watch("recurringFrequency");

  useEffect(() => {
    if (existingInvoice) {
      form.reset({
        clientId: existingInvoice.clientId || "",
        issueDate: new Date(existingInvoice.issueDate),
        dueDate: new Date(existingInvoice.dueDate),
        notes: existingInvoice.notes || "",
        isRecurring: existingInvoice.isRecurring || false,
        recurringFrequency: (existingInvoice as any).recurringFrequency || "monthly",
        recurringDay: (existingInvoice as any).recurringDay || 1,
        recurringMonth: (existingInvoice as any).recurringMonth || 1,
        recurringEvery: (existingInvoice as any).recurringEvery || 1,
      });
      if (existingInvoice.items && existingInvoice.items.length > 0) {
        setLineItems(existingInvoice.items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: parseFloat(item.quantity as string),
          rate: parseFloat(item.rate as string),
          taxTypeId: (item as any).taxTypeId || undefined,
          lineTotal: parseFloat(item.lineTotal as string),
        })));
      }
      // Load shipping data if it exists
      const shippingAmount = parseFloat((existingInvoice as any).shipping || "0");
      if (shippingAmount > 0) {
        setShippingEnabled(true);
        setShippingCost(shippingAmount);
      }
    }
  }, [existingInvoice, form]);

  // Populate form when duplicating an invoice
  useEffect(() => {
    if (sourceInvoice && !isEditing) {
      form.reset({
        clientId: sourceInvoice.clientId || "",
        issueDate: new Date(), // Use today's date for duplicated invoice
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        notes: sourceInvoice.notes || "",
        isRecurring: sourceInvoice.isRecurring || false,
        recurringFrequency: (sourceInvoice as any).recurringFrequency || "monthly",
        recurringDay: (sourceInvoice as any).recurringDay || 1,
        recurringMonth: (sourceInvoice as any).recurringMonth || 1,
        recurringEvery: (sourceInvoice as any).recurringEvery || 1,
      });
      if (sourceInvoice.items && sourceInvoice.items.length > 0) {
        setLineItems(sourceInvoice.items.map((item) => ({
          id: crypto.randomUUID(), // Generate new IDs for duplicated items
          description: item.description,
          quantity: parseFloat(item.quantity as string),
          rate: parseFloat(item.rate as string),
          taxTypeId: (item as any).taxTypeId || undefined,
          lineTotal: parseFloat(item.lineTotal as string),
        })));
      }
    }
  }, [sourceInvoice, isEditing, form]);

  useEffect(() => {
    if (taxTypes && taxTypes.length > 0 && !isEditing) {
      const defaultId = getDefaultTaxTypeId();
      if (defaultId) {
        setLineItems((items) =>
          items.map((item) => ({
            ...item,
            taxTypeId: item.taxTypeId || defaultId,
          }))
        );
      }
    }
  }, [taxTypes, isEditing]);

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        updated.lineTotal = updated.quantity * updated.rate;
        return updated;
      })
    );
  };

  const addLineItem = () => {
    setLineItems((items) => [
      ...items,
      { id: crypto.randomUUID(), description: "", quantity: 1, rate: 0, taxTypeId: getDefaultTaxTypeId(), lineTotal: 0 },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems((items) => items.filter((item) => item.id !== id));
    }
  };

  const addSavedItem = (savedItem: SavedItem) => {
    setLineItems((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        description: savedItem.description,
        quantity: 1,
        rate: parseFloat(savedItem.rate as string),
        taxTypeId: getDefaultTaxTypeId(),
        lineTotal: parseFloat(savedItem.rate as string),
      },
    ]);
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  
  const calculateTaxBreakdown = () => {
    const breakdown: { [key: string]: { name: string; rate: number; amount: number } } = {};
    
    lineItems.forEach((item) => {
      if (item.taxTypeId && taxTypes) {
        const taxType = taxTypes.find((t) => t.id === item.taxTypeId);
        if (taxType) {
          const rate = parseFloat(taxType.rate) / 100;
          const taxForItem = item.lineTotal * rate;
          
          if (!breakdown[taxType.id]) {
            breakdown[taxType.id] = { name: taxType.name, rate: parseFloat(taxType.rate), amount: 0 };
          }
          breakdown[taxType.id].amount += taxForItem;
        }
      }
    });
    
    return breakdown;
  };

  const taxBreakdown = calculateTaxBreakdown();
  const taxAmount = Object.values(taxBreakdown).reduce((sum, tax) => sum + tax.amount, 0);
  const shipping = shippingEnabled ? shippingCost : 0;
  const total = subtotal + taxAmount + shipping;

  // Validation: Check if invoice can be sent
  const canSendInvoice = () => {
    const clientId = form.getValues("clientId");
    const hasClient = !!clientId;
    // Tax type is optional - "No Tax" is a valid selection
    const hasValidLineItem = lineItems.some(
      (item) => item.description && item.quantity > 0 && item.rate >= 0
    );
    return hasClient && hasValidLineItem;
  };

  const isInvoiceValid = canSendInvoice();

  const saveMutation = useMutation({
    mutationFn: async (data: InvoiceFormData & { items: LineItem[]; status: string }) => {
      const payload = {
        clientId: data.clientId,
        issueDate: data.issueDate instanceof Date ? data.issueDate.toISOString() : data.issueDate,
        dueDate: data.dueDate instanceof Date ? data.dueDate.toISOString() : data.dueDate,
        notes: data.notes,
        status: data.status,
        isRecurring: data.isRecurring,
        recurringFrequency: data.isRecurring ? data.recurringFrequency : null,
        recurringDay: data.isRecurring ? data.recurringDay : null,
        recurringMonth: data.isRecurring && data.recurringFrequency === "yearly" ? data.recurringMonth : null,
        recurringEvery: data.isRecurring ? data.recurringEvery : null,
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        shipping: shipping.toString(),
        total: total.toString(),
        items: data.items.map((item) => ({
          description: item.description,
          quantity: item.quantity.toString(),
          rate: item.rate.toString(),
          taxTypeId: item.taxTypeId,
          lineTotal: item.lineTotal.toString(),
        })),
      };

      let invoiceId: string;
      
      if (isEditing) {
        await apiRequest("PATCH", `/api/invoices/${params.id}`, payload);
        invoiceId = params.id!;
      } else {
        const res = await apiRequest("POST", "/api/invoices", payload);
        const invoice = await res.json();
        invoiceId = invoice.id;
      }
      
      // If status is "sent", actually send the email
      if (data.status === "sent") {
        await apiRequest("POST", `/api/invoices/${invoiceId}/send`, {});
      }
      
      return invoiceId;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/usage"] });
      toast({ title: isEditing ? "Invoice updated" : "Invoice created and sent!" });
      
      // Track invoice creation/sending (only for new invoices)
      if (!isEditing) {
        trackInvoiceCreated({
          invoiceNumber: nextInvoiceNumber || '',
          total: total,
          hasRecurring: variables.isRecurring || false,
          itemCount: variables.items.length,
          status: variables.status as 'draft' | 'sent',
        });
        
        if (variables.status === 'sent') {
          trackInvoiceSent({
            invoiceNumber: nextInvoiceNumber || '',
            total: total,
          });
        }
        
        // Track recurring feature usage
        if (variables.isRecurring) {
          trackFeatureUsed('recurring_invoices');
        }
      }
      
      navigate("/dashboard");
    },
    onError: (error: any) => {
      if (error?.error === "INVOICE_LIMIT_REACHED") {
        toast({ 
          title: "Monthly invoice limit reached", 
          description: "Upgrade to Pro for unlimited invoices. Your invoice was saved as a draft.",
          variant: "destructive" 
        });
        navigate("/dashboard");
      } else {
        toast({ title: "Failed to save invoice", variant: "destructive" });
      }
    },
  });

  const handleSave = (status: string) => {
    const data = form.getValues();
    saveMutation.mutate({ ...data, items: lineItems, status });
  };

  const handleSendInvoice = async () => {
    const data = form.getValues();
    await saveMutation.mutateAsync({ ...data, items: lineItems, status: "sent" });
  };

  if ((isEditing && invoiceLoading) || (duplicateFromId && sourceInvoiceLoading)) {
    return (
      <AppLayout>
        <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[600px]" />
        </div>
      </AppLayout>
    );
  }

  const getDaySuffix = (day: number) => {
    if (day >= 11 && day <= 13) return "th";
    switch (day % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  };

  const getRecurringDescription = () => {
    const freq = recurringFrequency;
    const day = form.watch("recurringDay") || 1;
    const month = form.watch("recurringMonth") || 1;
    const every = form.watch("recurringEvery") || 1;
    const suffix = getDaySuffix(day);
    
    if (freq === "daily") {
      return every === 1 ? "Every day" : `Every ${every} days`;
    }
    if (freq === "weekly") {
      return every === 1 ? "Every week" : `Every ${every} weeks`;
    }
    if (freq === "monthly") {
      return every === 1 
        ? `On the ${day}${suffix} every month` 
        : `On the ${day}${suffix} every ${every} months`;
    }
    if (freq === "yearly") {
      const monthName = MONTHS[month - 1];
      return every === 1 
        ? `On ${monthName} ${day}${suffix} every year` 
        : `On ${monthName} ${day}${suffix} every ${every} years`;
    }
    return "";
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-6 pb-24">
        {/* Header with Invoice Number */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-heading" data-testid="text-create-invoice-title">
                {isEditing ? "Edit Invoice" : duplicateFromId ? "Duplicate Invoice" : "Create Invoice"}
              </h1>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Hash className="h-3.5 w-3.5" />
                <span className="text-sm" data-testid="text-invoice-number">
                  Invoice #{nextInvoiceNumber}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleSave("draft")}
                disabled={saveMutation.isPending}
                data-testid="button-save-draft"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <SendInvoiceButton 
                onClick={handleSendInvoice}
                disabled={saveMutation.isPending || !isInvoiceValid || (!isPro && subscriptionUsage && !subscriptionUsage.canSend)}
                className={!isInvoiceValid || (!isPro && subscriptionUsage && !subscriptionUsage.canSend) ? "opacity-50" : ""}
                disabledReason={
                  !isInvoiceValid
                    ? "Please fill in all required fields"
                    : undefined
                }
              />
            </div>
            {!isPro && subscriptionUsage && !subscriptionUsage.canSend && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {subscriptionUsage.count}/{subscriptionUsage.limit} free used
                </span>
                <Link href="/settings#subscription" onClick={() => trackUpgradeStarted('create_invoice')}>
                  <Badge variant="secondary" className="text-xs gap-1 cursor-pointer hover:bg-muted transition-colors">
                    <Crown className="h-3 w-3" />
                    Upgrade to Pro
                  </Badge>
                </Link>
              </div>
            )}
          </div>
        </div>

        <Form {...form}>
          <form className="space-y-6">
            {/* Client & Dates */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client</FormLabel>
                        <div className="flex gap-2">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-client" className="flex-1">
                                <SelectValue placeholder="Select a client" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients?.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.companyName ? `${client.companyName} (${client.name})` : client.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <QuickAddClient onSuccess={(id) => field.onChange(id)} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="issueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Issue Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                                data-testid="button-issue-date"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : "Pick a date"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                                data-testid="button-due-date"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : "Pick a date"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Recurring Invoice Section */}
                <div className="pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="isRecurring"
                    render={({ field }) => (
                      <FormItem className={`flex items-center justify-between rounded-lg border p-4 ${!isPro ? 'opacity-75' : ''}`}>
                        <div className="flex items-center gap-3">
                          <Repeat className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <FormLabel className="font-medium">Recurring Invoice</FormLabel>
                              {!isPro && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <Crown className="h-3 w-3" />
                                  Pro
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {!isPro 
                                ? "Upgrade to Pro to automatically generate recurring invoices" 
                                : isRecurring 
                                  ? getRecurringDescription() 
                                  : "Automatically generate this invoice on a schedule"}
                            </p>
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!isPro}
                            data-testid="switch-recurring"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {isRecurring && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name="recurringFrequency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Frequency</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-recurring-frequency">
                                    <SelectValue placeholder="Select frequency" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                  <SelectItem value="yearly">Yearly</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {recurringFrequency === "yearly" && (
                          <FormField
                            control={form.control}
                            name="recurringMonth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Month</FormLabel>
                                <Select 
                                  onValueChange={(v) => field.onChange(parseInt(v))} 
                                  value={String(field.value || 1)}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid="select-recurring-month">
                                      <SelectValue placeholder="Month" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {MONTHS.map((month, i) => (
                                      <SelectItem key={i + 1} value={String(i + 1)}>
                                        {month}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {(recurringFrequency === "monthly" || recurringFrequency === "yearly") && (
                          <FormField
                            control={form.control}
                            name="recurringDay"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Day</FormLabel>
                                <Select 
                                  onValueChange={(v) => field.onChange(parseInt(v))} 
                                  value={String(field.value || 1)}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid="select-recurring-day">
                                      <SelectValue placeholder="Day" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                      <SelectItem key={day} value={String(day)}>
                                        {day}{getDaySuffix(day)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={form.control}
                          name="recurringEvery"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Every
                              </FormLabel>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="1"
                                  max="12"
                                  className="w-20"
                                  value={field.value || 1}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                  data-testid="input-recurring-every"
                                />
                                <span className="text-sm text-muted-foreground">
                                  {recurringFrequency === "daily" && "day(s)"}
                                  {recurringFrequency === "weekly" && "week(s)"}
                                  {recurringFrequency === "monthly" && "month(s)"}
                                  {recurringFrequency === "yearly" && "year(s)"}
                                </span>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle>Line Items</CardTitle>
                {savedItems && savedItems.length > 0 && (
                  <Select onValueChange={(id) => {
                    const item = savedItems.find((i) => i.id === id);
                    if (item) addSavedItem(item);
                  }}>
                    <SelectTrigger className="w-48" data-testid="select-saved-item">
                      <SelectValue placeholder="Add saved item" />
                    </SelectTrigger>
                    <SelectContent>
                      {savedItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.description} - {formatCurrency(item.rate)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Desktop Header - hidden on mobile */}
                  <div className="hidden md:grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-1">
                    <div className="col-span-5">Description</div>
                    <div className="col-span-2">Tax</div>
                    <div className="col-span-1 text-right">Qty</div>
                    <div className="col-span-2 text-right">Rate</div>
                    <div className="col-span-1 text-right">Total</div>
                    <div className="col-span-1"></div>
                  </div>
                  
                  {/* Items */}
                  {lineItems.map((item, index) => (
                    <div key={item.id}>
                      {/* Mobile: Stacked card layout */}
                      <div className="md:hidden border rounded-lg p-4 space-y-3 bg-muted/30">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <Input
                              placeholder="Item description"
                              value={item.description}
                              onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                              data-testid={`input-item-description-${index}`}
                              className="text-base"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-10 w-10"
                            onClick={() => removeLineItem(item.id)}
                            disabled={lineItems.length === 1}
                            data-testid={`button-remove-item-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1.5 block">Quantity</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateLineItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                              data-testid={`input-item-quantity-${index}`}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1.5 block">Rate</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.rate}
                              onChange={(e) => updateLineItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                              data-testid={`input-item-rate-${index}`}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex-1">
                            {taxTypes && taxTypes.length > 0 ? (
                              <Select
                                value={item.taxTypeId || "none"}
                                onValueChange={(value) => updateLineItem(item.id, "taxTypeId", value === "none" ? undefined : value)}
                              >
                                <SelectTrigger data-testid={`select-item-tax-${index}`} className="w-full">
                                  <SelectValue placeholder="Select tax" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No Tax</SelectItem>
                                  {taxTypes.map((taxType) => (
                                    <SelectItem key={taxType.id} value={taxType.id}>
                                      {taxType.name} ({taxType.rate}%)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-sm text-muted-foreground">No tax</span>
                            )}
                          </div>
                          <div className="text-right pl-4">
                            <span className="text-xs text-muted-foreground block">Total</span>
                            <span className="font-semibold">{formatCurrency(item.lineTotal)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Desktop: Grid layout - hidden on mobile */}
                      <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <Input
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                            data-testid={`input-item-description-${index}`}
                          />
                        </div>
                        <div className="col-span-2">
                          {taxTypes && taxTypes.length > 0 ? (
                            <Select
                              value={item.taxTypeId || "none"}
                              onValueChange={(value) => updateLineItem(item.id, "taxTypeId", value === "none" ? undefined : value)}
                            >
                              <SelectTrigger data-testid={`select-item-tax-${index}`}>
                                <SelectValue placeholder="Tax" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Tax</SelectItem>
                                {taxTypes.map((taxType) => (
                                  <SelectItem key={taxType.id} value={taxType.id}>
                                    {taxType.name} ({taxType.rate}%)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="text-xs text-muted-foreground h-9 flex items-center">
                              No tax types
                            </div>
                          )}
                        </div>
                        <div className="col-span-1">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="text-right"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                            data-testid={`input-item-quantity-${index}`}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="text-right"
                            value={item.rate}
                            onChange={(e) => updateLineItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                            data-testid={`input-item-rate-${index}`}
                          />
                        </div>
                        <div className="col-span-1 text-right font-medium pr-2 text-sm">
                          {formatCurrency(item.lineTotal)}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLineItem(item.id)}
                            disabled={lineItems.length === 1}
                            data-testid={`button-remove-item-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button type="button" variant="outline" onClick={addLineItem} className="w-full" data-testid="button-add-line-item">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line Item
                  </Button>
                </div>

                {/* Totals with Tax Line */}
                <div className="mt-6 pt-6 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span data-testid="text-subtotal">{formatCurrency(subtotal)}</span>
                  </div>
                  {Object.entries(taxBreakdown).map(([id, tax]) => (
                    <div key={id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {tax.name} ({tax.rate}%)
                      </span>
                      <span data-testid={`text-tax-${id}`}>{formatCurrency(tax.amount)}</span>
                    </div>
                  ))}
                  {Object.keys(taxBreakdown).length === 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span data-testid="text-tax-amount">{formatCurrency(0)}</span>
                    </div>
                  )}
                  
                  {/* Shipping Section */}
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Shipping</span>
                        <Switch
                          checked={shippingEnabled}
                          onCheckedChange={setShippingEnabled}
                          className="scale-75"
                          data-testid="switch-shipping"
                        />
                      </div>
                      {shippingEnabled && (
                        <Input
                          type="number"
                          value={shippingCost || ""}
                          onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-24 h-7 text-sm text-right"
                          step="0.01"
                          min="0"
                          data-testid="input-shipping-cost"
                        />
                      )}
                      {!shippingEnabled && (
                        <span data-testid="text-shipping">{formatCurrency(0)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total</span>
                    <span data-testid="text-invoice-total">{formatCurrency(total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Add any notes or payment terms..."
                          {...field}
                          data-testid="input-invoice-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <p className="text-sm text-muted-foreground mt-3">
                  Payment method will be selected by the recipient when they view the invoice.
                </p>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
}
