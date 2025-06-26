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
import { GraduationCap } from "lucide-react";
import {
  useContactDetailsQuery,
  useCreateStudentRoleMutation,
} from "@/lib/query/student-roles/useStudentRole";

// Updated to match database schema enums
const programs = [
  { value: "LH", label: "LH" },
  { value: "LLC", label: "LLC" },
  { value: "ML", label: "ML" },
  { value: "Kollel", label: "Kollel" },
  { value: "Madrich", label: "Madrich" },
] as const;

const tracks = [
  { value: "Alef", label: "Alef" },
  { value: "Bet", label: "Bet" },
  { value: "Gimmel", label: "Gimmel" },
  { value: "Dalet", label: "Dalet" },
  { value: "Heh", label: "Heh" },
] as const;

const trackDetails = [
  { value: "Full Year", label: "Full Year" },
  { value: "Fall", label: "Fall" },
  { value: "Spring", label: "Spring" },
  { value: "Until Pesach", label: "Until Pesach" },
] as const;

const statuses = [
  { value: "Student", label: "Student" },
  { value: "Active Soldier", label: "Active Soldier" },
  { value: "Staff", label: "Staff" },
  { value: "Withdrew", label: "Withdrew" },
  { value: "Transferred Out", label: "Transferred Out" },
  { value: "Left Early", label: "Left Early" },
  { value: "Asked to Leave", label: "Asked to Leave" },
] as const;

const machzors = [
  { value: "10.5", label: "10.5" },
  { value: "10", label: "10" },
  { value: "9.5", label: "9.5" },
  { value: "9", label: "9" },
  { value: "8.5", label: "8.5" },
  { value: "8", label: "8" },
] as const;

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 2000 + 6 }, (_, i) => {
  const year = 2000 + i;
  return { value: `${year}-${year + 1}`, label: `${year}-${year + 1}` };
}).reverse();

const studentRoleSchema = z
  .object({
    contactId: z.coerce.number().positive("Contact ID is required"),
    program: z.enum(["LH", "LLC", "ML", "Kollel", "Madrich"], {
      required_error: "Program is required",
    }),
    track: z.enum(["Alef", "Bet", "Gimmel", "Dalet", "Heh"], {
      required_error: "Track is required",
    }),
    trackDetail: z
      .enum(["Full Year", "Fall", "Spring", "Until Pesach"])
      .optional(),
    status: z.enum(
      [
        "Student",
        "Active Soldier",
        "Staff",
        "Withdrew",
        "Transferred Out",
        "Left Early",
        "Asked to Leave",
      ],
      {
        required_error: "Status is required",
      }
    ),
    machzor: z.enum(["10.5", "10", "9.5", "9", "8.5", "8"]).optional(),
    year: z.string().min(1, "Year is required"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    isActive: z.boolean().default(true),
    additionalNotes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["endDate"],
    }
  );

type StudentRoleFormData = z.infer<typeof studentRoleSchema>;

interface StudentRoleDialogProps {
  contactId: number;
  contactName?: string;
  contactEmail?: string;
  triggerButton?: React.ReactNode;
}

export default function StudentRoleDialog(props: StudentRoleDialogProps) {
  const { contactId, triggerButton } = props;
  const [open, setOpen] = useState(false);

  const { data: contactData, isLoading: isLoadingContact } =
    useContactDetailsQuery(contactId);

  const createStudentRoleMutation = useCreateStudentRoleMutation();

  const form = useForm({
    resolver: zodResolver(studentRoleSchema),
    defaultValues: {
      contactId,
      program: undefined,
      track: undefined,
      trackDetail: undefined,
      status: "Student" as const,
      machzor: undefined,
      year: `${currentYear}-${currentYear + 1}`,
      startDate: "",
      endDate: "",
      isActive: true,
      additionalNotes: "",
    },
  });

  const resetForm = () => {
    form.reset({
      contactId,
      program: undefined,
      track: undefined,
      trackDetail: undefined,
      status: "Student" as const,
      machzor: undefined,
      year: `${currentYear}-${currentYear + 1}`,
      startDate: "",
      endDate: "",
      isActive: true,
      additionalNotes: "",
    });
  };

  const onSubmit = async (data: StudentRoleFormData) => {
    try {
      await createStudentRoleMutation.mutateAsync(data);
      resetForm();
      setOpen(false);
    } catch (error) {
      console.error("Error creating student role:", error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const selectedProgram = form.watch("program");
  const selectedTrack = form.watch("track");
  const selectedTrackDetail = form.watch("trackDetail");
  const selectedStatus = form.watch("status");
  const selectedMachzor = form.watch("machzor");
  const selectedYear = form.watch("year");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button size="sm" variant="outline" className="border-dashed">
            <GraduationCap className="w-4 h-4 mr-2" />
            Add Student Role
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Student Role</DialogTitle>
          <DialogDescription>
            {isLoadingContact ? (
              "Loading contact details..."
            ) : (
              <div>
                {contactData?.activeStudentRoles &&
                  contactData.activeStudentRoles.length > 0 && (
                    <div className="mt-2">
                      <span className="text-sm text-muted-foreground">
                        Current student roles:{" "}
                        {contactData.activeStudentRoles
                          .map((role) => `${role.program} (${role.year})`)
                          .join(", ")}
                      </span>
                    </div>
                  )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="program"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select program" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {programs.map((program) => (
                          <SelectItem key={program.value} value={program.value}>
                            {program.label}
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
                name="track"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Track *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select track" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tracks.map((track) => (
                          <SelectItem key={track.value} value={track.value}>
                            {track.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px]">
                        {years.map((year) => (
                          <SelectItem key={year.value} value={year.value}>
                            {year.label}
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
                name="trackDetail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Track Detail</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select track detail" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {trackDetails.map((detail) => (
                          <SelectItem key={detail.value} value={detail.value}>
                            {detail.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
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
                name="machzor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Machzor</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select machzor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {machzors.map((machzor) => (
                          <SelectItem key={machzor.value} value={machzor.value}>
                            {machzor.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

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
                    <p className="text-sm text-muted-foreground">
                      Whether this student role is currently active
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="additionalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Additional notes about this student role"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <h4 className="font-medium text-blue-900 mb-2">
                Student Role Summary
              </h4>
              <div className="text-sm text-blue-800 space-y-1">
                <div>
                  Program:{" "}
                  {selectedProgram
                    ? programs.find((p) => p.value === selectedProgram)?.label
                    : "Not selected"}
                </div>
                <div>
                  Track:{" "}
                  {selectedTrack
                    ? tracks.find((t) => t.value === selectedTrack)?.label
                    : "Not selected"}
                </div>
                {selectedTrackDetail && (
                  <div>
                    Track Detail:{" "}
                    {
                      trackDetails.find(
                        (td) => td.value === selectedTrackDetail
                      )?.label
                    }
                  </div>
                )}
                <div>Year: {selectedYear}</div>
                <div>
                  Status:{" "}
                  {selectedStatus
                    ? statuses.find((s) => s.value === selectedStatus)?.label
                    : "Not selected"}
                </div>
                {selectedMachzor && (
                  <div>
                    Machzor:{" "}
                    {machzors.find((m) => m.value === selectedMachzor)?.label}
                  </div>
                )}
                <div>Active: {form.watch("isActive") ? "Yes" : "No"}</div>
                {form.watch("startDate") && (
                  <div>
                    Start Date:{" "}
                    {new Date(
                      form.watch("startDate") as any
                    ).toLocaleDateString()}
                  </div>
                )}
                {form.watch("endDate") && (
                  <div>
                    End Date:{" "}
                    {new Date(
                      form.watch("endDate") as any
                    ).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createStudentRoleMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={form.handleSubmit(onSubmit)}
                disabled={
                  createStudentRoleMutation.isPending || isLoadingContact
                }
                className="text-white"
              >
                {createStudentRoleMutation.isPending
                  ? "Adding..."
                  : "Add Student Role"}
              </Button>
            </div>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
