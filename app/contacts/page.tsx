import ContactsTable from "@/components/contacts/contacts-table";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

export default function ContactsPage() {
  return (
    <main className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <Link href="/dashboard">
          <Button variant="outline" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            View Dashboard
          </Button>
        </Link>
      </div>
      <Suspense
        fallback={<div className="text-center py-8">Loading contacts...</div>}
      >
        <ContactsTable />
      </Suspense>
    </main>
  );
}
