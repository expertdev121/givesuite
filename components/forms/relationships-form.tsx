/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Users } from "lucide-react";
import {
  useCreateRelationshipMutation,
  useContactSearchQuery,
  useContactDetailsQuery,
} from "@/lib/query/relationships/useRelationshipQuery";

const relationshipTypes = [
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "grandmother", label: "Grandmother" },
  { value: "grandfather", label: "Grandfather" },
  { value: "grandparent", label: "Grandparent" },
  { value: "parent", label: "Parent" },
  { value: "step-parent", label: "Step-parent" },
  { value: "stepmother", label: "Stepmother" },
  { value: "stepfather", label: "Stepfather" },
  { value: "sister", label: "Sister" },
  { value: "brother", label: "Brother" },
  { value: "step-sister", label: "Step-sister" },
  { value: "step-brother", label: "Step-brother" },
  { value: "stepson", label: "Stepson" },
  { value: "daughter", label: "Daughter" },
  { value: "son", label: "Son" },
  { value: "aunt", label: "Aunt" },
  { value: "uncle", label: "Uncle" },
  { value: "aunt/uncle", label: "Aunt/Uncle" },
  { value: "nephew", label: "Nephew" },
  { value: "niece", label: "Niece" },
  { value: "grandson", label: "Grandson" },
  { value: "granddaughter", label: "Granddaughter" },
  { value: "cousin (m)", label: "Cousin (M)" },
  { value: "cousin (f)", label: "Cousin (F)" },
  { value: "spouse", label: "Spouse" },
  { value: "partner", label: "Partner" },
  { value: "wife", label: "Wife" },
  { value: "husband", label: "Husband" },
  { value: "former husband", label: "Former Husband" },
  { value: "former wife", label: "Former Wife" },
  { value: "fiance", label: "Fiancé" },
  { value: "divorced co-parent", label: "Divorced Co-parent" },
  { value: "separated co-parent", label: "Separated Co-parent" },
  { value: "legal guardian", label: "Legal Guardian" },
  { value: "legal guardian partner", label: "Legal Guardian Partner" },
  { value: "friend", label: "Friend" },
  { value: "neighbor", label: "Neighbor" },
  { value: "relative", label: "Relative" },
  { value: "business", label: "Business" },
  { value: "owner", label: "Owner" },
  { value: "chevrusa", label: "Chevrusa" },
  { value: "congregant", label: "Congregant" },
  { value: "rabbi", label: "Rabbi" },
  { value: "contact", label: "Contact" },
  { value: "foundation", label: "Foundation" },
  { value: "donor", label: "Donor" },
  { value: "fund", label: "Fund" },
  { value: "rebbi contact", label: "Rebbi Contact" },
  { value: "rebbi contact for", label: "Rebbi Contact For" },
  { value: "employee", label: "Employee" },
  { value: "employer", label: "Employer" },
  { value: "machatunim", label: "Machatunim" },
] as const;

// Extract the values properly for the enum
const relationshipValues = relationshipTypes.map((type) => type.value);

const relationshipSchema = z
  .object({
    contactId: z.coerce.number().positive("Contact ID is required"),
    relatedContactId: z.number().positive("Related contact must be selected"),
    relationshipType: z.enum(relationshipValues as [string, ...string[]], {
      required_error: "Relationship type is required",
    }),
    isActive: z.boolean().default(true),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      return data.contactId !== data.relatedContactId;
    },
    {
      message: "Cannot create relationship with the same contact",
      path: ["relatedContactId"],
    }
  );

type RelationshipFormData = z.infer<typeof relationshipSchema>;

interface RelationshipDialogProps {
  contactId: number;
  contactName?: string;
  contactEmail?: string;
  triggerButton?: React.ReactNode;
}

export default function RelationshipDialog(props: RelationshipDialogProps) {
  const { contactId, contactName, contactEmail, triggerButton } = props;
  const [open, setOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  const { data: contactData, isLoading: isLoadingContact } =
    useContactDetailsQuery(contactId);

  const { data: searchResults, isLoading: isSearching } = useContactSearchQuery(
    contactSearch,
    { enabled: contactSearch.length >= 2 }
  );

  const effectiveContactName =
    contactName || (contactData?.contact.fullName ?? `Contact #${contactId}`);
  const effectiveContactEmail = contactEmail || contactData?.contact.email;

  const createRelationshipMutation = useCreateRelationshipMutation();

  const form = useForm({
    resolver: zodResolver(relationshipSchema),
    defaultValues: {
      contactId,
      relatedContactId: 0,
      relationshipType: undefined,
      isActive: true,
      notes: "",
    },
  });

  const resetForm = () => {
    form.reset({
      contactId,
      relatedContactId: 0,
      relationshipType: undefined,
      isActive: true,
      notes: "",
    });
    setContactSearch("");
  };

  const onSubmit = async (data: RelationshipFormData) => {
    try {
      await createRelationshipMutation.mutateAsync(data as any);
      resetForm();
      setOpen(false);
    } catch (error) {
      console.error("Error creating relationship:", error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const selectedRelationshipType = form.watch("relationshipType");
  const selectedRelatedContactId = form.watch("relatedContactId");

  // Find the selected contact from search results
  const selectedRelatedContact = searchResults?.contacts?.find(
    (contact: any) => contact.id === selectedRelatedContactId
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button size="sm" variant="outline" className="border-dashed">
            <Users className="w-4 h-4 mr-2" />
            Add Relationship
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Relationship</DialogTitle>
          <DialogDescription>
            {isLoadingContact ? (
              "Loading contact details..."
            ) : (
              <div>
                Create a relationship for: {effectiveContactName}
                {effectiveContactEmail && (
                  <span className="block mt-1 text-sm text-muted-foreground">
                    {effectiveContactEmail}
                  </span>
                )}
                {contactData?.activeRelationships &&
                  contactData.activeRelationships.length > 0 && (
                    <div className="mt-2">
                      <span className="text-sm text-muted-foreground">
                        Current relationships:{" "}
                        {contactData.activeRelationships.length} active
                      </span>
                    </div>
                  )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <div className="space-y-4">
            <div>
              <FormLabel>Search Related Contact *</FormLabel>
              <div className="space-y-2">
                <Input
                  placeholder="Type name or email to search contacts..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                />

                {contactSearch.length >= 2 && (
                  <div className="max-h-32 overflow-y-auto border rounded-md">
                    {isSearching ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Searching...
                      </div>
                    ) : searchResults?.contacts &&
                      searchResults.contacts.length > 0 ? (
                      <div className="space-y-1">
                        {searchResults.contacts
                          .filter((contact: any) => contact.id !== contactId)
                          .map((contact: any) => (
                            <button
                              key={contact.id}
                              type="button"
                              className="w-full text-left p-2 hover:bg-gray-50 text-sm"
                              onClick={() => {
                                form.setValue("relatedContactId", contact.id);
                                setContactSearch(
                                  `${contact.firstName} ${contact.lastName}`
                                );
                              }}
                            >
                              <div className="font-medium">
                                {contact.firstName} {contact.lastName}
                              </div>
                              {contact.email && (
                                <div className="text-muted-foreground">
                                  {contact.email}
                                </div>
                              )}
                            </button>
                          ))}
                      </div>
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">
                        No contacts found
                      </div>
                    )}
                  </div>
                )}

                {selectedRelatedContact && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                    <strong>Selected:</strong>{" "}
                    {selectedRelatedContact.firstName}{" "}
                    {selectedRelatedContact.lastName}
                    {selectedRelatedContact.email && (
                      <span className="block text-muted-foreground">
                        {selectedRelatedContact.email}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="relatedContactId"
                render={() => (
                  <FormItem className="hidden">
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="relationshipType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship Type *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px]">
                      {relationshipTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active Relationship</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Whether this relationship is currently active
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Additional notes about this relationship"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <h4 className="font-medium text-blue-900 mb-2">
                Relationship Summary
              </h4>
              <div className="text-sm text-blue-800 space-y-1">
                <div>
                  <strong>{effectiveContactName}</strong> is the{" "}
                  <strong>
                    {selectedRelationshipType
                      ? relationshipTypes
                          .find((t) => t.value === selectedRelationshipType)
                          ?.label.toLowerCase()
                      : "[relationship type]"}
                  </strong>{" "}
                  of{" "}
                  <strong>
                    {selectedRelatedContact
                      ? `${selectedRelatedContact.firstName} ${selectedRelatedContact.lastName}`
                      : "[selected contact]"}
                  </strong>
                </div>
                <div>
                  Status: {form.watch("isActive") ? "Active" : "Inactive"}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createRelationshipMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={form.handleSubmit(onSubmit)}
                disabled={
                  createRelationshipMutation.isPending ||
                  isLoadingContact ||
                  !selectedRelatedContactId ||
                  !selectedRelationshipType
                }
                className="text-white"
              >
                {createRelationshipMutation.isPending
                  ? "Adding..."
                  : "Add Relationship"}
              </Button>
            </div>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
