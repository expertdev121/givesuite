/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type React from "react";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircleIcon } from "lucide-react";
import { contactRoleSchema } from "@/lib/form-schemas/contact-role";
import { useCreateContactRole } from "@/lib/query/useContactRoles";

type ContactRoleFormValues = z.infer<typeof contactRoleSchema>;

interface ContactRoleDialogProps {
  contactId: number;
}

export default function ContactRoleDialog({
  contactId,
}: ContactRoleDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(contactRoleSchema),
    defaultValues: {
      contactId: contactId,
      roleName: "",
      isActive: true,
      startDate: "",
      endDate: "",
      notes: "",
    },
  });

  const { mutate: createContact, isPending, error } = useCreateContactRole();

  const handleSubmit = (values: ContactRoleFormValues) => {
    createContact(values, {
      onSuccess: (response) => {
        console.log("Contact role created successfully:", response);
        form.reset();
        setOpen(false);
      },
      onError: (error) => {
        console.error("Error creating contact role:", error);
        // You might want to show an error message to the user here
      },
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
    }
  };

  // Add error logging
  if (error) {
    console.error("Mutation error:", error);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="border-dashed text-white">
          <PlusCircleIcon />
          New Contact Role
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Contact Role</DialogTitle>
          <DialogDescription>
            Add a contact role. Fill in the required information below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="roleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter role name" {...field} />
                    </FormControl>
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
                      <FormLabel>Active Role</FormLabel>
                      <FormDescription>
                        Check if this role is currently active
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div> */}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Show error message if mutation fails */}
            {error && (
              <div className="text-red-500 text-sm">
                Error: {error.message || "Failed to create contact role"}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                // disabled={isPending || form.formState.isSubmitting}
              >
                {isPending || form.formState.isSubmitting
                  ? "Saving..."
                  : "Save Role"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
