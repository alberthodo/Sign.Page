"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type UserAccountMenuProps = {
  email: string;
};

export function UserAccountMenu({ email }: UserAccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [isSigningOut, startSignOut] = useTransition();

  function handleSignOut() {
    startSignOut(async () => {
      await signOut();
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        nativeButton
        render={
          <button
            type="button"
            className={cn(
              "flex max-w-[min(100%,16rem)] items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted-foreground",
              "transition-colors hover:bg-muted hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
            aria-label="Account menu"
          />
        }
      >
        <span className="truncate">{email}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 opacity-70 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          render={<Link href="/dashboard/profile" onClick={() => setOpen(false)} />}
        >
          <User className="size-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Settings className="size-4" />
          <span>Settings</span>
          <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isSigningOut}
          onClick={handleSignOut}
        >
          <LogOut className="size-4" />
          {isSigningOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
