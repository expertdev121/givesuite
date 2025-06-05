import ContactDetailsClient from "@/components/contacts/Contact-Details-Client";

export default async function ContactDetailsPage({
  params,
}: {
  params: Promise<{ contactId: number }>;
}) {
  const { contactId } = await params;
  return <ContactDetailsClient contactId={contactId} />;
}
