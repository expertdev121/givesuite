import ContactsTable from "@/components/contacts/contacts-table";
import { Suspense } from "react";

export default function ContactsPage() {
  return (
    <main className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
        <p className="mt-2 text-muted-foreground">
          View and manage your contacts
        </p>
      </div>
      <Suspense
        fallback={<div className="text-center py-8">Loading contacts...</div>}
      >
        <ContactsTable />
      </Suspense>
    </main>
  );
}
