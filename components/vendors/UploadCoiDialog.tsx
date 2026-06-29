"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { COIUploader } from "@/components/vendors/COIUploader";

export function UploadCoiDialog({ vendorId }: { vendorId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UploadCloud className="h-4 w-4" /> Upload COI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload a certificate</DialogTitle>
          <DialogDescription>
            Drop the vendor&apos;s COI PDF. We&apos;ll parse the key fields so
            you can review them, then update their compliance status.
          </DialogDescription>
        </DialogHeader>
        <COIUploader
          vendorId={vendorId}
          review
          onUploaded={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
