"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sortVendorTypesWithOtherLast } from "@/lib/vendor-types";
import type { Vendor } from "@/lib/types";

export function VendorFormFields({
  vendor,
  vendorTypes,
}: {
  vendor?: Vendor;
  vendorTypes: string[];
}) {
  // Keep the vendor's current type selectable even if it's no longer
  // in the list, so editing other fields never silently changes it.
  const options = sortVendorTypesWithOtherLast(
    vendor?.vendor_type && !vendorTypes.includes(vendor.vendor_type)
      ? [...vendorTypes, vendor.vendor_type]
      : vendorTypes
  );
  const namedOptions = options.filter((t) => t !== "Other");
  const hasOther = options.includes("Other");

  const [selectedType, setSelectedType] = useState(vendor?.vendor_type ?? "");
  const isOther = selectedType === "Other";

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
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="" disabled>
            Select a contractor type…
          </option>
          {namedOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          {hasOther && (
            <>
              <option disabled>──────────</option>
              <option value="Other">Other</option>
            </>
          )}
        </select>
      </div>
      {isOther && (
        <div className="grid gap-2">
          <Label htmlFor="vendor_type_notes">
            Describe vendor type (optional)
          </Label>
          <Input
            id="vendor_type_notes"
            name="vendor_type_notes"
            maxLength={100}
            defaultValue={vendor?.vendor_type_notes ?? ""}
            placeholder="e.g. Sign installer, porta-potty rental, photographer"
          />
        </div>
      )}
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
