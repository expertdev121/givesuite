import InvoiceTemplateEditor from "@/components/contacts/InvoiceTemplateEditor";

export default function InvoiceTemplatePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Invoice Template Settings</h1>
      <InvoiceTemplateEditor />
    </div>
  );
}
