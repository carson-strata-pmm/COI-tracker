import { ShieldCheck, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { COIUploader } from "@/components/vendors/COIUploader";
import { resolveUploadRequest } from "@/lib/upload-request";

export default async function UploadPage({
  params,
}: {
  params: { token: string };
}) {
  const result = await resolveUploadRequest(params.token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold tracking-tight">
            CertTrack
          </span>
        </div>

        {"error" in result ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <CardTitle>{titleForError(result.error)}</CardTitle>
              <CardDescription>
                {messageForError(result.error)}
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Upload your certificate of insurance</CardTitle>
              <CardDescription>
                <span className="font-medium text-foreground">
                  {result.org.name}
                </span>{" "}
                has requested a current COI from{" "}
                <span className="font-medium text-foreground">
                  {result.vendor.company_name}
                </span>
                . No account needed — just drop your PDF below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <COIUploader token={params.token} />
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Powered by CertTrack — secure COI compliance tracking.
        </p>
      </div>
    </div>
  );
}

function titleForError(error: string): string {
  switch (error) {
    case "completed":
      return "Already uploaded";
    case "expired":
      return "This link has expired";
    case "not_configured":
      return "Upload temporarily unavailable";
    default:
      return "Link not found";
  }
}

function messageForError(error: string): string {
  switch (error) {
    case "completed":
      return "A certificate has already been uploaded for this request. Contact the requesting business if you need to submit a new one.";
    case "expired":
      return "Upload links are valid for 30 days. Please ask the requesting business to send a new link.";
    case "not_configured":
      return "The service isn't fully configured yet. Please try again later.";
    default:
      return "This upload link is invalid. Please check the link or request a new one.";
  }
}
