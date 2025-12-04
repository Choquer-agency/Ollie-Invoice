import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Client } from "@shared/schema";

const clientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  companyName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientFormSchema>;

function ClientForm({ 
  client, 
  onSuccess, 
  onCancel 
}: { 
  client?: Client; 
  onSuccess: () => void; 
  onCancel: () => void;
}) {
  const { toast } = useToast();
  
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: client?.name || "",
      companyName: client?.companyName || "",
      email: client?.email || "",
      phone: client?.phone || "",
      address: client?.address || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      if (client) {
        await apiRequest("PATCH", `/api/clients/${client.id}`, data);
      } else {
        await apiRequest("POST", "/api/clients", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: client ? "Client updated" : "Client added" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to save client", variant: "destructive" });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input placeholder="Client name" {...field} data-testid="input-client-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company</FormLabel>
              <FormControl>
                <Input placeholder="Company name" {...field} data-testid="input-client-company" />
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
                <Input type="email" placeholder="client@example.com" {...field} data-testid="input-client-email" />
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
                <Input placeholder="+1 (555) 123-4567" {...field} data-testid="input-client-phone" />
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
                <Textarea placeholder="123 Main St, City, State, ZIP" {...field} data-testid="input-client-address" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending} data-testid="button-save-client">
            {mutation.isPending ? "Saving..." : client ? "Update" : "Add Client"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function ClientRow({ client, onEdit, onDelete }: { 
  client: Client; 
  onEdit: () => void; 
  onDelete: () => void;
}) {
  return (
    <div 
      className="flex items-center justify-between gap-4 p-4 border-b last:border-b-0 hover-elevate" 
      data-testid={`row-client-${client.id}`}
    >
      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4">
        <div className="min-w-0">
          <div className="font-medium truncate" data-testid={`text-client-name-${client.id}`}>{client.name}</div>
          {client.companyName && (
            <div className="text-sm text-muted-foreground truncate" data-testid={`text-client-company-${client.id}`}>
              {client.companyName}
            </div>
          )}
        </div>
        <div className="min-w-0">
          {client.email && (
            <div className="text-sm text-muted-foreground truncate" data-testid={`text-client-email-${client.id}`}>
              {client.email}
            </div>
          )}
        </div>
        <div className="min-w-0">
          {client.phone && (
            <div className="text-sm text-muted-foreground truncate" data-testid={`text-client-phone-${client.id}`}>
              {client.phone}
            </div>
          )}
        </div>
        <div className="min-w-0 hidden sm:block">
          {client.address && (
            <div className="text-sm text-muted-foreground truncate" data-testid={`text-client-address-${client.id}`}>
              {client.address}
            </div>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" data-testid={`button-client-menu-${client.id}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function Clients() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();
  const { toast } = useToast();

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete client", variant: "destructive" });
    },
  });

  const handleOpenDialog = (client?: Client) => {
    setEditingClient(client);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditingClient(undefined);
    setIsDialogOpen(false);
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-clients-title">Clients</h1>
            <p className="text-muted-foreground">Manage your client list</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} data-testid="button-add-client">
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingClient ? "Edit Client" : "Add New Client"}</DialogTitle>
              </DialogHeader>
              <ClientForm
                client={editingClient}
                onSuccess={handleCloseDialog}
                onCancel={handleCloseDialog}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Client List */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : !clients || clients.length === 0 ? (
          <EmptyState type="clients" onAction={() => handleOpenDialog()} />
        ) : (
          <Card>
            <div className="divide-y">
              {clients.map((client) => (
                <ClientRow
                  key={client.id}
                  client={client}
                  onEdit={() => handleOpenDialog(client)}
                  onDelete={() => deleteMutation.mutate(client.id)}
                />
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
