import PledgesTable from "@/components/pledges/Pledges-Client";
import React from "react";

export default async function ContactDetailsPage({
  params,
}: {
  params: Promise<{ contactId: number }>;
}) {
  const { contactId } = await params;
  return <PledgesTable contactId={Number(contactId)} />;
}
