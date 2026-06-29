"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Drag-and-drop COI uploader. Posts the PDF to /api/parse-coi
 * (Phase 3), which uploads to Storage, parses via Textract (falling
 * back to Claude), stores the certificate, and recalculates vendor
 * status. On success the page is refreshed to show the new cert.
 */
export function COIUploader({
  vendorId,
  token,
  onUploaded,
}: {
  vendorId?: string;
  token?: string;
  onUploaded?: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function pick(f: File | null) {
    setError(null);
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("Please upload a PDF.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File is too large (max 10MB).");
      return;
    }
    setFile(f);
  }

  function upload() {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("file", file);
        if (vendorId) fd.append("vendor_id", vendorId);
        if (token) fd.append("token", token);
        const res = await fetch("/api/parse-coi", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        setDone(true);
        onUploaded?.();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      }
    });
  }

  if (done) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        Certificate uploaded and parsed. It now appears in the history below.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0] ?? null);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          dragging
            ? "border-primary bg-accent"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">{file.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <UploadCloud className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              Drop a COI PDF here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">PDF up to 10MB</p>
          </>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {file && (
        <Button onClick={upload} disabled={pending} className="w-full">
          {pending ? "Uploading & parsing…" : "Upload certificate"}
        </Button>
      )}
    </div>
  );
}
