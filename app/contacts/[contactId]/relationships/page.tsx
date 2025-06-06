import React from "react";

export default async function Relationships({
  params,
}: {
  params: Promise<{ contactId: number }>;
}) {
  const { contactId } = await params;
  return (
    <div>
      <p>{contactId}</p>
    </div>
  );
}
