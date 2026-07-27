import { useQuery } from "@tanstack/react-query";
import { mealImageQuery } from "@/lib/queries";
import { UtensilsCrossed } from "lucide-react";

export function MealImage({
  path,
  alt,
  className = "",
}: {
  path: string | null;
  alt: string;
  className?: string;
}) {
  const { data: url } = useQuery(mealImageQuery(path));

  if (!path || !url) {
    return (
      <div className={`grid place-items-center bg-secondary text-primary/60 ${className}`}>
        <UtensilsCrossed className="h-6 w-6" />
      </div>
    );
  }

  return <img src={url} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
}
