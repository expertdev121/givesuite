"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import React from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function CurrentBreadcrumb() {
  const pathname = usePathname();
  const router = useRouter();

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((segment, index, array) => {
      const href = "/" + array.slice(0, index + 1).join("/");
      const label = decodeURIComponent(segment).replace(/-/g, " ");
      return { label: label.charAt(0).toUpperCase() + label.slice(1), href };
    });

  const shouldShowBackButton = pathname !== "/" && pathname !== "/contacts";

  const handleBackClick = () => {
    router.back();
  };

  return (
    <div className="flex items-center gap-3">
      {shouldShowBackButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackClick}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </Button>
      )}

      <Breadcrumb className={cn("px-4 py-3 backdrop-blur-sm rounded-lg")}>
        <BreadcrumbList className="gap-1.5">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link
                href="/"
                className="text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1 hover:underline"
              >
                <span className="inline-flex items-center justify-center w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs">
                  H
                </span>
                <span>Home</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </BreadcrumbSeparator>

          {segments.map((segment, index) => (
            <React.Fragment key={segment.href}>
              <BreadcrumbItem>
                {index === segments.length - 1 ? (
                  <span className="text-muted-foreground font-medium">
                    {segment.label}
                  </span>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link
                      href={segment.href}
                      className="text-primary hover:text-primary/80 font-medium transition-colors hover:underline"
                    >
                      {segment.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>

              {index < segments.length - 1 && (
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </BreadcrumbSeparator>
              )}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
