import { ContactTable } from "@/components/contacts/contacts-table";

export default function ContactsPage() {
  return (
    <main className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
        <p className="mt-2 text-muted-foreground">
          View and manage your contacts
        </p>
      </div>
      <ContactTable />
    </main>
  );
}
