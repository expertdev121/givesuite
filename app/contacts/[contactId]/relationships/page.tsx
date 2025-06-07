import RelationshipsTable from "@/components/relationships/relationships-client";
import React from "react";

export default async function Relationships({
  params,
}: {
  params: Promise<{ contactId: number }>;
}) {
  const { contactId } = await params;
  return <RelationshipsTable contactId={contactId} />;
}
