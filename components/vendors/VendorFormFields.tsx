import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Vendor } from "@/lib/types";

export function VendorFormFields({ vendor }: { vendor?: Vendor }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="company_name">Company name *</Label>
        <Input
          id="company_name"
          name="company_name"
          required
          defaultValue={vendor?.company_name ?? ""}
          placeholder="Bright Spark Electric"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contact_name">Contact name</Label>
        <Input
          id="contact_name"
          name="contact_name"
          defaultValue={vendor?.contact_name ?? ""}
          placeholder="Dana Ruiz"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contact_email">Contact email</Label>
        <Input
          id="contact_email"
          name="contact_email"
          type="email"
          defaultValue={vendor?.contact_email ?? ""}
          placeholder="dana@brightspark.com"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contact_phone">Contact phone</Label>
        <Input
          id="contact_phone"
          name="contact_phone"
          type="tel"
          defaultValue={vendor?.contact_phone ?? ""}
          placeholder="+1 555 000 0000"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="vendor_type">Vendor type</Label>
        <Input
          id="vendor_type"
          name="vendor_type"
          defaultValue={vendor?.vendor_type ?? ""}
          placeholder="electrical, roofing, landscaping…"
        />
      </div>
    </div>
  );
}
