"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type CopyLinkButtonProps = {
  url: string;
  label?: string;
};

export function CopyLinkButton({ url, label = "Copy link" }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
      {copied ? "Copied" : label}
    </Button>
  );
}
