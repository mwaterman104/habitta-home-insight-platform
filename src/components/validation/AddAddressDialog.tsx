import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { ValidationCockpitDB } from "@/lib/validation-cockpit";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

interface AddAddressDialogProps {
  onAddComplete: () => void;
  children: React.ReactNode;
}

interface AddressForm {
  street_address: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  apn?: string;
  source_list?: string;
  assigned_to?: string;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export function AddAddressDialog({ onAddComplete, children }: AddAddressDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<AddressForm>();

  const onSubmit = async (data: AddressForm) => {
    setLoading(true);
    try {
      const propertyData = {
        ...data,
        status: 'pending' as const,
        source_list: data.source_list || 'Manual Entry'
      };

      await ValidationCockpitDB.createPropertySample(propertyData);
      
      toast.success('Address added successfully');
      setOpen(false);
      reset();
      onAddComplete();
    } catch (error) {
      console.error('Error adding address:', error);
      toast.error('Failed to add address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Address
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street_address">Street Address *</Label>
            <Input
              id="street_address"
              {...register("street_address", { required: "Street address is required" })}
              placeholder="123 Main St"
              disabled={loading}
            />
            {errors.street_address && (
              <p className="text-sm text-destructive">{errors.street_address.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unit/Apartment</Label>
            <Input
              id="unit"
              {...register("unit")}
              placeholder="Apt 2A"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                {...register("city", { required: "City is required" })}
                placeholder="Miami"
                disabled={loading}
              />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Select onValueChange={(value) => setValue("state", value)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && (
                <p className="text-sm text-destructive">{errors.state.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zip">ZIP Code *</Label>
            <Input
              id="zip"
              {...register("zip", { 
                required: "ZIP code is required",
                pattern: {
                  value: /^\d{5}(-\d{4})?$/,
                  message: "Invalid ZIP code format"
                }
              })}
              placeholder="33101"
              disabled={loading}
            />
            {errors.zip && (
              <p className="text-sm text-destructive">{errors.zip.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="apn">APN (Assessor Parcel Number)</Label>
            <Input
              id="apn"
              {...register("apn")}
              placeholder="Optional"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source_list">Source</Label>
            <Input
              id="source_list"
              {...register("source_list")}
              placeholder="Manual Entry"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assigned To</Label>
            <Input
              id="assigned_to"
              {...register("assigned_to")}
              placeholder="Optional"
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Address'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}