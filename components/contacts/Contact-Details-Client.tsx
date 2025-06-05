"use client";

import { useContactQuery } from "@/lib/query/useContactDetails";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

import React from "react";
import { Tab, useTabs } from "@/hooks/useTabs";
import { AnimatePresence } from "motion/react";
import { Tabs } from "@/components/contacts/Contact-Details-Tabs";
import TabContent from "@/components/contacts/Tab-Content";

const tabs = [
  { label: "Contact Overview", value: "contact-overview" },
  { label: "Financial Summary", value: "financial-summary" },
];

export default function ContactDetailsClient({
  contactId,
}: {
  contactId: number;
}) {
  const { data, isLoading, isError, error } = useContactQuery({
    contactId,
    page: 1,
    limit: 10,
  });

  const [hookProps] = React.useState(() => {
    const initialTabId = tabs[0].value;

    return {
      tabs: tabs.map(({ label, value, subRoutes }: Tab) => ({
        label,
        value,
        subRoutes,
      })),
      initialTabId,
    };
  });

  const framer = useTabs(hookProps);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="space-y-4 max-w-md w-full">
          <Skeleton className="h-12 w-full" />
          <div className="flex gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md w-full">
          <CardHeader className="items-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <CardTitle>Error Loading Contact</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-destructive">
            {error?.message || "An error occurred"}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data?.contact || !data?.financialSummary) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md w-full">
          <CardHeader className="items-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <CardTitle>No Data Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            Contact information could not be found
          </CardContent>
        </Card>
      </div>
    );
  }

  const { contact, financialSummary } = data;

  return (
    <div className="min-h-screen">
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <nav className="sticky top-4 z-50 mb-3 flex px-4">
          <div className="flex items-center gap-6 px-8 py-4 bg-white/20 backdrop-blur-md border border-white/30 rounded-full shadow-lg shadow-black/5">
            <Avatar className="h-12 w-12 border-2 border-white/50">
              <AvatarImage
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${contact.firstName} ${contact.lastName}`}
                alt={`${contact.firstName} ${contact.lastName}`}
              />
              <AvatarFallback className="text-sm font-medium bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                {contact.firstName[0]}
                {contact.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-lg font-medium text-gray-800 dark:text-gray-200">
              {contact.firstName} {contact.lastName}
            </span>
          </div>
        </nav>
        <div className="w-full">
          <div className="relative flex w-full items-center justify-between border-b dark:border-dark-4 overflow-x-auto overflow-y-hidden">
            <Tabs {...framer.tabProps} />
          </div>
          <AnimatePresence mode="wait">
            <TabContent
              tab={framer.selectedTab}
              contact={contact}
              financialSummary={financialSummary}
            />
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
