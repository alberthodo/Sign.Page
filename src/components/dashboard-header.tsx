import { BrandLogo } from "@/components/brand-logo";
import { UserAccountMenu } from "@/components/user-account-menu";

type DashboardHeaderProps = {
  email: string;
};

export function DashboardHeader({ email }: DashboardHeaderProps) {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6 sm:px-8">
        <BrandLogo href="/dashboard" />
        <UserAccountMenu email={email} />
      </div>
    </header>
  );
}
