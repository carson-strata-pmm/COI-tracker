import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Vendor } from "@/lib/types";

export function VendorFormFields({
  vendor,
  vendorTypes,
}: {
  vendor?: Vendor;
  vendorTypes: string[];
}) {
  // Keep the vendor's current type selectable even if it no longer
  // falls in the (industry-filtered) options list, so editing other
  // fields never silently changes it.
  const options =
    vendor?.vendor_type && !vendorTypes.includes(vendor.vendor_type)
      ? [...vendorTypes, vendor.vendor_type]
      : vendorTypes;

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
        <Label htmlFor="vendor_type">Contractor type *</Label>
        <select
          id="vendor_type"
          name="vendor_type"
          required
          defaultValue={vendor?.vendor_type ?? ""}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="" disabled>
            Select a contractor type…
          </option>
          {options.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
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
    </div>
  );
}
