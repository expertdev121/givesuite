/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileSpreadsheet, FileText, Loader2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import {
  getContacts,
  getPayments,
  getPaymentsWithDetails,
  getPledges,
  getPledgesWithDetails,
  getStudentRoles,
  getSolicitors,
  getCategories,
} from "./queries";

const dataTypes = [
  { value: "contacts", label: "Contacts", query: getContacts },
  { value: "payments", label: "Payments", query: getPayments },
  {
    value: "payments_detailed",
    label: "Payments (Detailed)",
    query: getPaymentsWithDetails,
  },
  { value: "pledges", label: "Pledges", query: getPledges },
  {
    value: "pledges_detailed",
    label: "Pledges (Detailed)",
    query: getPledgesWithDetails,
  },
  { value: "student_roles", label: "Student Roles", query: getStudentRoles },
  { value: "solicitors", label: "Solicitors", query: getSolicitors },
  { value: "categories", label: "Categories", query: getCategories },
];

export default function ExportData() {
  const [selectedDataType, setSelectedDataType] = useState("contacts");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const currentDataType = dataTypes.find((dt) => dt.value === selectedDataType);

  const { data, isLoading, error } = useQuery({
    queryKey: [selectedDataType],
    queryFn: currentDataType?.query || (() => Promise.resolve([])),
    enabled: !!currentDataType,
  });

  const formatDataForExport = (data: any[]) => {
    if (!data || !data.length) return [];

    return data.map((item) => {
      const formatted: any = {};
      Object.keys(item).forEach((key) => {
        const header = key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase());
        let value = item[key];
        if (value instanceof Date) {
          value = value.toISOString().split("T")[0];
        } else if (
          typeof value === "string" &&
          value.includes("T") &&
          value.includes("Z")
        ) {
          value = new Date(value).toISOString().split("T")[0];
        }
        formatted[header] = value;
      });
      return formatted;
    });
  };

  const exportToXLSX = async () => {
    if (!data || !data.length) return;
    setIsExporting(true);
    setExportError(null);
    try {
      const formattedData = formatDataForExport(data);
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(formattedData);
      const colWidths = Object.keys(formattedData[0] || {}).map((key) => ({
        wch: Math.max(key.length, 15),
      }));
      ws["!cols"] = colWidths;
      XLSX.utils.book_append_sheet(
        wb,
        ws,
        selectedDataType.replace("_", " ").toUpperCase()
      );
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `${selectedDataType}_export_${timestamp}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error("Export to XLSX failed:", error);
      setExportError("Failed to export to XLSX.");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = async () => {
    if (!data || !data.length) return;
    setIsExporting(true);
    setExportError(null);
    try {
      const formattedData = formatDataForExport(data);
      const headers = Object.keys(formattedData[0]);
      const csvContent = [
        headers.join(","),
        ...formattedData.map((row) =>
          headers
            .map((header) => {
              const value = row[header];
              if (
                typeof value === "string" &&
                (value.includes(",") || value.includes('"'))
              ) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value ?? "";
            })
            .join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `${selectedDataType}_export_${timestamp}.csv`;
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Export to CSV failed:", error);
      setExportError("Failed to export to CSV.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full mx-auto p-6">
      <Card>
        <CardContent className="p-6">
          {(error || exportError) && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error ? "Failed to load data from database." : exportError}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between mb-6">
            <Select
              value={selectedDataType}
              onValueChange={setSelectedDataType}
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dataTypes.map((dataType) => (
                  <SelectItem key={dataType.value} value={dataType.value}>
                    {dataType.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isLoading ? (
              <Badge variant="secondary">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Loading...
              </Badge>
            ) : (
              <Badge variant="outline">{data?.length || 0} records</Badge>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <Button
              onClick={exportToXLSX}
              disabled={isExporting || !data?.length || isLoading}
              className="bg-black text-white hover:bg-gray-800"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              Export XLSX
            </Button>

            <Button
              onClick={exportToCSV}
              disabled={isExporting || !data?.length || isLoading}
              variant="outline"
              className="bg-white text-black border-gray-300 hover:bg-gray-50"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
