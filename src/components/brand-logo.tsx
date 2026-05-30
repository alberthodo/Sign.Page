import Image from "next/image";
import Link from "next/link";
import { BRAND_LOGO_MARK } from "@/lib/brand";
import { getAppName } from "@/lib/app-name";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  wordmarkClassName?: string;
  href?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  /** `display` for auth/marketing hero; `header` for nav bars */
  variant?: "display" | "header";
  /**
   * `light` — dark wordmark on paper (nav, login).
   * `dark` — image mark for dark footer/chrome (`logo.b.png`).
   * Omit to follow `.dark` ancestor (app shell).
   */
  tone?: "light" | "dark";
};

const IMAGE_HEIGHT = {
  header: 28,
  display: 36,
} as const;

function BrandWordmark({
  className,
  variant,
  inverted = false,
}: {
  className?: string;
  variant: "display" | "header";
  inverted?: boolean;
}) {
  const appName = getAppName();

  return (
    <span
      className={cn(
        "font-heading font-semibold tracking-tight",
        variant === "display" ? "text-2xl" : "text-lg",
        inverted ? "text-white" : "text-foreground",
        className,
      )}
    >
      {appName}
    </span>
  );
}

function BrandImageMark({
  variant,
  className,
}: {
  variant: "display" | "header";
  className?: string;
}) {
  const appName = getAppName();
  const height = IMAGE_HEIGHT[variant];
  const sizeClass = variant === "display" ? "h-9" : "h-7";

  return (
    <Image
      src={BRAND_LOGO_MARK}
      alt={appName}
      width={160}
      height={height}
      className={cn("w-auto", sizeClass, className)}
      priority
    />
  );
}

export function BrandLogo({
  className,
  wordmarkClassName,
  href,
  onClick,
  variant = "header",
  tone,
}: BrandLogoProps) {
  const wrap = (node: React.ReactNode) => {
    if (href) {
      return (
        <Link
          href={href}
          onClick={onClick}
          className={cn(
            "inline-flex min-w-0 max-w-full items-center no-underline hover:opacity-80",
            className,
          )}
        >
          {node}
        </Link>
      );
    }
    return <span className={cn("inline-flex items-center", className)}>{node}</span>;
  };

  if (tone === "light") {
    return wrap(
      <BrandWordmark variant={variant} className={wordmarkClassName} />,
    );
  }

  if (tone === "dark") {
    return wrap(<BrandImageMark variant={variant} />);
  }

  /* App shell: wordmark on light UI, image mark under `.dark` */
  return wrap(
    <>
      <BrandWordmark variant={variant} className="dark:hidden" />
      <BrandImageMark variant={variant} className="hidden dark:block" />
    </>,
  );
}
