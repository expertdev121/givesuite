import React from "react";

export default async function StudentRoles({
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
