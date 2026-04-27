import { useBranding } from "@/hooks/useBranding";
import { Gem } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  variant?: "mark" | "horizontal";
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

export const BrandLogo = ({
  variant = "mark",
  className,
  showText = false,
  textClassName,
}: BrandLogoProps) => {
  const b = useBranding();
  const url = variant === "horizontal" ? b.logo_horizontal_url : b.logo_mark_url;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {url ? (
        <img
          src={url}
          alt={b.product_name}
          className={cn(
            variant === "horizontal" ? "h-9 w-auto object-contain" : "h-10 w-10 rounded-lg object-cover",
          )}
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-gold">
          <Gem className="h-5 w-5 text-primary-foreground" />
        </div>
      )}
      {showText && variant === "mark" && (
        <div className={textClassName}>
          <div className="font-display text-lg font-semibold leading-tight">
            {b.product_name}
          </div>
          {b.tagline && (
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {b.tagline}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
