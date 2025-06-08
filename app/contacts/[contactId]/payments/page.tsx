import PaymentsTable from "@/components/payments/payments-client";
import React from "react";

export default async function PaymentDetailsPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;
  const contactIdNumber = parseInt(contactId, 10);
  if (isNaN(contactIdNumber)) {
    return (
      <div className="p-4">
        <div className="text-red-600">Invalid contact ID</div>
      </div>
    );
  }
  return <PaymentsTable contactId={contactIdNumber} />;
}
