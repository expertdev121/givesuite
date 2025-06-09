import ContactsTable from "@/components/contacts/contacts-table";
import { Suspense } from "react";

export default function ContactsPage() {
  return (
    <main className="container mx-auto py-8">
      <Suspense
        fallback={<div className="text-center py-8">Loading contacts...</div>}
      >
        <ContactsTable />
      </Suspense>
    </main>
  );
}
