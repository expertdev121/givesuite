"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface TemplateFormData {
  orgNameEn: string;
  orgNameHeb: string;
  logoUrl: string;
  establishedYear: string;
  headerNotes: string;
  footerNotes: string;
  tableHeaders: string; // JSON string
}

interface InvoiceTemplate {
  id: number;
  orgNameEn: string;
  orgNameHeb: string;
  logoUrl?: string;
  establishedYear: string;
  headerNotes?: string;
  footerNotes: string;
  tableHeaders: Record<string, string>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function InvoiceTemplateEditor() {
  const [template, setTemplate] = useState<InvoiceTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TemplateFormData>();

  useEffect(() => {
    fetchTemplate();
  }, []);

  const fetchTemplate = async () => {
    try {
      const response = await fetch("/api/invoice/template");
      if (response.ok) {
        const data = await response.json();
        setTemplate(data);
        reset({
          orgNameEn: data.orgNameEn,
          orgNameHeb: data.orgNameHeb,
          logoUrl: data.logoUrl || "",
          establishedYear: data.establishedYear,
          headerNotes: data.headerNotes || "",
          footerNotes: data.footerNotes,
          tableHeaders: JSON.stringify(data.tableHeaders, null, 2),
        });
      }
    } catch (error) {
      toast.error("Failed to load template");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: TemplateFormData) => {
    setSaving(true);
    try {
      let tableHeaders = {};
      try {
        tableHeaders = JSON.parse(data.tableHeaders);
      } catch {
        toast.error("Invalid JSON for table headers");
        return;
      }

      const response = await fetch("/api/invoice/template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          tableHeaders,
        }),
      });

      if (response.ok) {
        toast.success("Template updated successfully");
        fetchTemplate();
      } else {
        toast.error("Failed to update template");
      }
    } catch (error) {
      toast.error("Error updating template");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Template Editor</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="orgNameEn">Organization Name (English)</Label>
            <Input id="orgNameEn" {...register("orgNameEn", { required: true })} />
            {errors.orgNameEn && <span className="text-red-500">Required</span>}
          </div>

          <div>
            <Label htmlFor="orgNameHeb">Organization Name (Hebrew)</Label>
            <Input id="orgNameHeb" {...register("orgNameHeb", { required: true })} />
            {errors.orgNameHeb && <span className="text-red-500">Required</span>}
          </div>

          <div>
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input id="logoUrl" {...register("logoUrl")} />
          </div>

          <div>
            <Label htmlFor="establishedYear">Established Year</Label>
            <Input id="establishedYear" {...register("establishedYear", { required: true })} />
            {errors.establishedYear && <span className="text-red-500">Required</span>}
          </div>

          <div>
            <Label htmlFor="headerNotes">Header Notes</Label>
            <Textarea id="headerNotes" {...register("headerNotes")} />
          </div>

          <div>
            <Label htmlFor="footerNotes">Footer Notes</Label>
            <Textarea id="footerNotes" {...register("footerNotes", { required: true })} />
            {errors.footerNotes && <span className="text-red-500">Required</span>}
          </div>

          <div>
            <Label htmlFor="tableHeaders">Table Headers (JSON)</Label>
            <Textarea id="tableHeaders" {...register("tableHeaders")} rows={5} />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Template"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
