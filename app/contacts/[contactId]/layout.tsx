"use client";

import TabLink from "@/components/next-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useContactQuery } from "@/lib/query/useContactDetails";
import { useParams } from "next/navigation";
import type React from "react";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { contactId } = useParams<{ contactId: string }>();
  const contactIdNum = parseInt(contactId, 10);
  const isValidId = !isNaN(contactIdNum);

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      {!isValidId ? (
        <div>Invalid contact ID</div>
      ) : (
        <>
          <ContactDetails contactId={contactIdNum} />
          <div className="border-b">
            <nav className="flex space-x-8">
              <TabLink href={`/contacts/${contactId}`} exact>
                General
              </TabLink>
              <TabLink href="/settings/billing">Billing & Usage</TabLink>
              <TabLink href="/settings/users">Users</TabLink>
            </nav>
          </div>
          <div className="py-6">{children}</div>
        </>
      )}
    </div>
  );
}

function ContactDetails({ contactId }: { contactId: number }) {
  const { data, isLoading, isError, error } = useContactQuery({
    contactId,
    page: 1,
    limit: 10,
  });

  if (isLoading) return <div>Loading contact...</div>;
  if (isError) return <div>Error loading contact: {error.message}</div>;
  if (!data || !data.contact) return <div>No contact data available</div>;

  return (
    <nav className="sticky top-4 z-50 mb-3 flex px-4">
      <div className="flex items-center gap-6 px-8 py-4 bg-white/20 backdrop-blur-md border border-white/30 rounded-full shadow-lg shadow-black/5">
        <Avatar className="h-12 w-12 border-2 border-white/50">
          <AvatarImage
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${data.contact.firstName} ${data.contact.lastName}`}
            alt={`${data.contact.firstName} ${data.contact.lastName}`}
          />
          <AvatarFallback className="text-sm font-medium bg-gradient-to-br from-purple-500 to-blue-500 text-white">
            {data.contact.firstName[0]}
            {data.contact.lastName[0]}
          </AvatarFallback>
        </Avatar>
        <span className="text-lg font-medium text-gray-800 dark:text-gray-200">
          {data.contact.firstName} {data.contact.lastName}
        </span>
      </div>
    </nav>
  );
}
