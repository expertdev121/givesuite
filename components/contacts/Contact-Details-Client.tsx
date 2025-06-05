"use client";

import { useContactQuery } from "@/lib/query/useContactDetails";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Mail, MessageCircle, AlertCircle } from "lucide-react";

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
      {/* Header Section */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container max-w-7xl mx-auto py-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <Avatar className="h-20 w-20 border">
              <AvatarImage
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${contact.firstName} ${contact.lastName}`}
                alt={`${contact.firstName} ${contact.lastName}`}
              />
              <AvatarFallback className="text-xl">
                {contact.firstName[0]}
                {contact.lastName[0]}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <h1 className="text-3xl font-bold">
                  {contact.title ? `${contact.title}. ` : ""}
                  {contact.firstName} {contact.lastName}
                </h1>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Active</Badge>
                  {contact.contactRoles.some(
                    (role) => role.roleName === "Donor"
                  ) && <Badge>Donor</Badge>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <div className="bg-muted p-2 rounded-full">
                    <Mail className="h-4 w-4" />
                  </div>
                  <span className="text-sm">{contact.email ?? "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-muted p-2 rounded-full">
                    <Phone className="h-4 w-4" />
                  </div>
                  <span className="text-sm">{contact.phone ?? "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-muted p-2 rounded-full">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <span className="text-sm">
                    WhatsApp: {contact.phone ?? "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden md:flex flex-col items-end gap-2">
              <div className="text-sm text-muted-foreground">
                Financial Status
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">
                  ${financialSummary.currentBalanceUsd}
                </span>
                <span className="text-sm text-muted-foreground">balance</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto py-8 px-4">
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
