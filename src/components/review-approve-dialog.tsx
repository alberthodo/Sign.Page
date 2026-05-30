"use client";

import { useState, useTransition } from "react";
import { SignaturePad } from "@/components/signature-pad";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ReviewApproveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: (signerName: string, signature: string) => Promise<{ error?: string }>;
  onSuccess: () => void;
};

export function ReviewApproveDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  onSuccess,
}: ReviewApproveDialogProps) {
  const [signerName, setSignerName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    const name = signerName.trim();
    if (!name) {
      setError("Enter your full name.");
      return;
    }
    if (!signature) {
      setError("Draw your signature to approve.");
      return;
    }

    startTransition(async () => {
      const result = await onConfirm(name, signature);
      if (result.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      setSignerName("");
      setSignature(null);
      onSuccess();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signer-name">Full name</Label>
            <Input
              id="signer-name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Your name"
              disabled={isPending}
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label>Signature</Label>
            <SignaturePad onChange={setSignature} />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={handleConfirm}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {isPending ? "Locking approval…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
