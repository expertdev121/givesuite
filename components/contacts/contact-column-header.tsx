"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SortField, SortOrder } from "@/types/contact";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

interface ContactColumnHeaderProps {
  title: string;
  field?: SortField;
  sortable?: boolean;
  className?: string;
  currentSortField?: SortField;
  currentSortOrder?: SortOrder;
  onSort?: (field: SortField) => void;
}

export function ContactColumnHeader({
  title,
  field,
  sortable = false,
  className,
  currentSortField,
  currentSortOrder,
  onSort,
}: ContactColumnHeaderProps) {
  if (!sortable || !field) {
    return (
      <div className={cn("text-sm font-medium text-left", className)}>
        {title}
      </div>
    );
  }

  const isActive = currentSortField === field;
  const icon = isActive ? (
    currentSortOrder === "asc" ? (
      <ArrowUp className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4" />
    )
  ) : (
    <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />
  );

  return (
    <Button
      variant="ghost"
      className={cn(
        "flex items-center gap-1 p-0 font-medium text-left hover:bg-transparent",
        isActive && "text-primary",
        className
      )}
      onClick={() => onSort?.(field)}
    >
      {title}
      {icon}
    </Button>
  );
}
