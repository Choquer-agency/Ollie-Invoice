import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { EmptyState } from "@/components/EmptyState";
import { AddClientButton } from "@/components/AddClientButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { MoreHorizontal, Pencil, Trash2, ChevronRight } from "lucide-react";
import type { Client } from "@shared/schema";
import { trackClientCreated } from "@/lib/analytics";

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
  onCancel,
  currentClientCount = 0,
}: { 
  client?: Client; 
  onSuccess: () => void; 
  onCancel: () => void;
  currentClientCount?: number;
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
      
      // Track new client creation
      if (!client) {
        trackClientCreated(currentClientCount + 1);
      }
      
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

// Mobile card with touch handling to prevent scroll-triggered taps
function MobileClientCard({ 
  client, 
  onClick 
}: { 
  client: Client; 
  onClick: () => void;
}) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    const deltaTime = Date.now() - touchStartRef.current.time;
    
    // Only trigger click if it's a quick tap with minimal movement
    if (deltaX < 10 && deltaY < 10 && deltaTime < 300) {
      onClick();
    }
    
    touchStartRef.current = null;
  };

  return (
    <div
      className="p-4 border-b last:border-b-0 active:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between gap-3"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => {
        // For non-touch devices
        if (!('ontouchstart' in window)) {
          onClick();
        }
      }}
      data-testid={`row-client-${client.id}`}
    >
      <div className="min-w-0 flex-1">
        <div className="font-medium" data-testid={`text-client-name-${client.id}`}>
          {client.name}
        </div>
        <div className="text-sm text-muted-foreground truncate" data-testid={`text-client-company-${client.id}`}>
          {client.companyName || client.email || "-"}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </div>
  );
}

function ClientsTable({ clients, onEdit, onDelete }: { 
  clients: Client[]; 
  onEdit: (client: Client) => void; 
  onDelete: (id: string) => void;
}) {
  return (
    <>
      {/* Mobile card layout */}
      <div className="md:hidden rounded-lg border bg-background overflow-hidden">
        {clients.map((client) => (
          <MobileClientCard
            key={client.id}
            client={client}
            onClick={() => onEdit(client)}
          />
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Company</TableHead>
              <TableHead className="font-semibold hidden lg:table-cell">Email</TableHead>
              <TableHead className="font-semibold hidden lg:table-cell">Phone</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow 
                key={client.id}
                className="hover-elevate cursor-pointer"
                onClick={() => onEdit(client)}
                data-testid={`row-client-${client.id}`}
              >
                <TableCell className="font-medium" data-testid={`text-client-name-${client.id}`}>
                  {client.name}
                </TableCell>
                <TableCell className="text-muted-foreground" data-testid={`text-client-company-${client.id}`}>
                  {client.companyName || "-"}
                </TableCell>
                <TableCell className="text-muted-foreground hidden lg:table-cell" data-testid={`text-client-email-${client.id}`}>
                  {client.email || "-"}
                </TableCell>
                <TableCell className="text-muted-foreground hidden lg:table-cell" data-testid={`text-client-phone-${client.id}`}>
                  {client.phone || "-"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" data-testid={`button-client-menu-${client.id}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(client); }}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(client.id); }} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
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
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading" data-testid="text-clients-title">Clients</h1>
            <p className="text-muted-foreground">Manage your client list</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AddClientButton onClick={() => handleOpenDialog()} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingClient ? "Edit Client" : "Add New Client"}</DialogTitle>
              </DialogHeader>
              <ClientForm
                client={editingClient}
                onSuccess={handleCloseDialog}
                onCancel={handleCloseDialog}
                currentClientCount={clients?.length || 0}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Client List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : !clients || clients.length === 0 ? (
          <EmptyState type="clients" onAction={() => handleOpenDialog()} />
        ) : (
          <ClientsTable
            clients={clients}
            onEdit={handleOpenDialog}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        )}
      </div>
    </AppLayout>
  );
}
