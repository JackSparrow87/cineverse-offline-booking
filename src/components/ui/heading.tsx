
import { cn } from "@/lib/utils";

interface HeadingProps {
  title: string;
  description?: string;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export function Heading({
  title,
  description,
  className,
  titleClassName,
  descriptionClassName,
}: HeadingProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <h1 className={cn(
        "text-3xl font-bold tracking-tight cinema-text-shadow", 
        titleClassName
      )}>
        {title}
      </h1>
      {description && (
        <p className={cn(
          "text-muted-foreground",
          descriptionClassName
        )}>
          {description}
        </p>
      )}
    </div>
  );
}
