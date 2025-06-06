import { ContactFormValues } from "@/components/forms/contact-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

async function createContact(data: ContactFormValues) {
  const response = await fetch("/api/contacts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create contact");
  }

  return response.json();
}

export function useCreateContact() {
  return useMutation({
    mutationFn: createContact,
    onSuccess: (data) => {
      console.log(data);
      toast.success("Contact created successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create contact");
    },
  });
}
