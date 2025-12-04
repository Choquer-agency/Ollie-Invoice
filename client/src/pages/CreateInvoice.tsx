import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Trash2, CalendarIcon, Save, Send, Eye, ArrowLeft, UserPlus } from "lucide-react";
import type { Client, Business, InvoiceWithRelations, SavedItem } from "@shared/schema";

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  rate: z.number().min(0, "Rate must be 0 or greater"),
  taxable: z.boolean().default(true),
});

type LineItem = z.infer<typeof lineItemSchema> & { id: string; lineTotal: number };

const invoiceFormSchema = z.object({
  clientId: z.string().optional(),
  issueDate: z.date(),
  dueDate: z.date(),
  notes: z.string().optional(),
  paymentMethod: z.enum(["stripe", "etransfer", "both"]).default("stripe"),
  isRecurring: z.boolean().default(false),
  recurringInterval: z.enum(["monthly", "weekly", "yearly"]).optional(),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

function QuickAddClient({ onSuccess }: { onSuccess: (clientId: string) => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/clients", { name, email });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client added" });
      onSuccess(data.id);
      setOpen(false);
      setName("");
      setEmail("");
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
            <label className="text-sm font-medium">Name *</label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Client name"
              data-testid="input-quick-client-name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="client@example.com"
              data-testid="input-quick-client-email"
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

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, rate: 0, taxable: true, lineTotal: 0 },
  ]);

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: business } = useQuery<Business | null>({
    queryKey: ["/api/business"],
  });

  const { data: savedItems } = useQuery<SavedItem[]>({
    queryKey: ["/api/saved-items"],
  });

  const { data: existingInvoice, isLoading: invoiceLoading } = useQuery<InvoiceWithRelations>({
    queryKey: ["/api/invoices", params.id],
    enabled: !!isEditing,
  });

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      clientId: "",
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      notes: "",
      paymentMethod: "stripe",
      isRecurring: false,
    },
  });

  // Load existing invoice data
  useEffect(() => {
    if (existingInvoice) {
      form.reset({
        clientId: existingInvoice.clientId || "",
        issueDate: new Date(existingInvoice.issueDate),
        dueDate: new Date(existingInvoice.dueDate),
        notes: existingInvoice.notes || "",
        paymentMethod: existingInvoice.paymentMethod as any || "stripe",
        isRecurring: existingInvoice.isRecurring || false,
        recurringInterval: existingInvoice.recurringInterval as any || undefined,
      });
      if (existingInvoice.items && existingInvoice.items.length > 0) {
        setLineItems(existingInvoice.items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: parseFloat(item.quantity as string),
          rate: parseFloat(item.rate as string),
          taxable: item.taxable || true,
          lineTotal: parseFloat(item.lineTotal as string),
        })));
      }
    }
  }, [existingInvoice, form]);

  const taxRate = parseFloat(business?.taxRate || "0") / 100;

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
      { id: crypto.randomUUID(), description: "", quantity: 1, rate: 0, taxable: true, lineTotal: 0 },
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
        taxable: true,
        lineTotal: parseFloat(savedItem.rate as string),
      },
    ]);
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const taxableAmount = lineItems
    .filter((item) => item.taxable)
    .reduce((sum, item) => sum + item.lineTotal, 0);
  const taxAmount = taxableAmount * taxRate;
  const total = subtotal + taxAmount;

  const saveMutation = useMutation({
    mutationFn: async (data: InvoiceFormData & { items: LineItem[]; status: string }) => {
      const payload = {
        ...data,
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        total: total.toString(),
        items: data.items.map((item) => ({
          description: item.description,
          quantity: item.quantity.toString(),
          rate: item.rate.toString(),
          taxable: item.taxable,
          lineTotal: item.lineTotal.toString(),
        })),
      };

      if (isEditing) {
        await apiRequest("PATCH", `/api/invoices/${params.id}`, payload);
      } else {
        await apiRequest("POST", "/api/invoices", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: isEditing ? "Invoice updated" : "Invoice saved" });
      navigate("/dashboard");
    },
    onError: () => {
      toast({ title: "Failed to save invoice", variant: "destructive" });
    },
  });

  const handleSave = (status: string) => {
    const data = form.getValues();
    saveMutation.mutate({ ...data, items: lineItems, status });
  };

  if (isEditing && invoiceLoading) {
    return (
      <AppLayout>
        <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[600px]" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-create-invoice-title">
                {isEditing ? "Edit Invoice" : "Create Invoice"}
              </h1>
              <p className="text-muted-foreground">
                {business?.businessName || "Set up your business profile in Settings"}
              </p>
            </div>
          </div>
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
            <Button 
              onClick={() => handleSave("sent")}
              disabled={saveMutation.isPending}
              data-testid="button-send-invoice"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Invoice
            </Button>
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
                                  {client.name}
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
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-1">
                    <div className="col-span-5">Description</div>
                    <div className="col-span-2 text-right">Qty</div>
                    <div className="col-span-2 text-right">Rate</div>
                    <div className="col-span-2 text-right">Total</div>
                    <div className="col-span-1"></div>
                  </div>
                  
                  {/* Items */}
                  {lineItems.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                          data-testid={`input-item-description-${index}`}
                        />
                      </div>
                      <div className="col-span-2">
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
                      <div className="col-span-2 text-right font-medium pr-2">
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
                  ))}
                  
                  <Button type="button" variant="outline" onClick={addLineItem} className="w-full" data-testid="button-add-line-item">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line Item
                  </Button>
                </div>

                {/* Totals */}
                <div className="mt-6 pt-6 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {taxRate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax ({(taxRate * 100).toFixed(1)}%)</span>
                      <span>{formatCurrency(taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total</span>
                    <span data-testid="text-invoice-total">{formatCurrency(total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment & Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Payment & Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-method">
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="stripe">Credit Card (Stripe)</SelectItem>
                            <SelectItem value="etransfer">E-Transfer</SelectItem>
                            <SelectItem value="both">Both Options</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="isRecurring"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <FormLabel className="font-medium">Recurring Invoice</FormLabel>
                            <p className="text-sm text-muted-foreground">Auto-send this invoice monthly</p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-recurring"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
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
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
}
