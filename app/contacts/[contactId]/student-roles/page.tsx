import StudentRolesTable from "@/components/student-roles/student-roles-client";
import React from "react";

export default async function StudentRoles({
  params,
}: {
  params: Promise<{ contactId: number }>;
}) {
  const { contactId } = await params;
  return <StudentRolesTable contactId={contactId} />;
}
