import ContactRolesTable from "@/components/contact-roles/contact-roles-client";
import React from "react";

export default async function ContactRoles({
  params,
}: {
  params: Promise<{ contactId: number }>;
}) {
  const { contactId } = await params;
  return <ContactRolesTable contactId={contactId} />;
}
