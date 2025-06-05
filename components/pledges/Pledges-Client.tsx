/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDataTable } from "@/hooks/use-data-table";
import type { Column, ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import * as React from "react";
import { DataTable } from "../data-table/data-table";
import { DataTableColumnHeader } from "../data-table/data-table-column-header";
import { DataTableToolbar } from "../data-table/data-table-toolbar";
import { usePledgesQuery } from "@/lib/query/usePledgeData";

interface Project {
  id: number;
  pledgeDate: string;
  description: string | null;
  originalAmount: string;
  currency: string;
  originalAmountUsd: string | null;
  totalPaid: string;
  totalPaidUsd: string | null;
  balance: string;
  balanceUsd: string | null;
  notes: string | null;
  categoryName: string | null;
  categoryDescription: string | null;
  progressPercentage: number;
}

interface PledgesTableProps {
  contactId: number;
  categoryId?: number;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  status?: "fullyPaid" | "partiallyPaid" | "unpaid";
  search?: string;
}

export function PledgesTable({
  contactId,
  categoryId,
  page = 1,
  limit = 10,
  startDate,
  endDate,
  status,
  search,
}: PledgesTableProps) {
  const {
    data: pledgesData,
    isLoading,
    error,
    isError,
  } = usePledgesQuery({
    contactId,
    categoryId,
    page,
    limit,
    startDate,
    endDate,
    status,
    search,
  });

  const columns = React.useMemo<ColumnDef<Project>[]>(
    () => [
      {
        id: "pledgeDate",
        accessorKey: "pledgeDate",
        header: ({ column }: { column: Column<Project, unknown> }) => (
          <DataTableColumnHeader column={column} title="Pledge Date" />
        ),
        cell: ({ cell }) => {
          const date = cell.getValue<Project["pledgeDate"]>();
          return <div>{new Date(date).toLocaleDateString()}</div>;
        },
        meta: {
          label: "Pledge Date",
        },
        enableColumnFilter: true,
      },
      {
        id: "description",
        accessorKey: "description",
        header: ({ column }: { column: Column<Project, unknown> }) => (
          <DataTableColumnHeader column={column} title="Pledge Detail" />
        ),
        cell: ({ cell }) => (
          <div>{cell.getValue<Project["description"]>() || "—"}</div>
        ),
        meta: {
          label: "Pledge Detail",
        },
        enableColumnFilter: true,
      },
      {
        id: "originalAmountUsd",
        accessorKey: "originalAmountUsd",
        header: ({ column }: { column: Column<Project, unknown> }) => (
          <DataTableColumnHeader column={column} title="Pledge Amount" />
        ),
        cell: ({ cell }) => {
          const amount = cell.getValue<Project["originalAmountUsd"]>();
          return (
            <div>{amount ? `$${parseFloat(amount).toFixed(2)}` : "—"}</div>
          );
        },
      },
      {
        id: "totalPaidUsd",
        accessorKey: "totalPaidUsd",
        header: ({ column }: { column: Column<Project, unknown> }) => (
          <DataTableColumnHeader column={column} title="Paid" />
        ),
        cell: ({ cell }) => {
          const amount = cell.getValue<Project["totalPaidUsd"]>();
          return (
            <div>{amount ? `$${parseFloat(amount).toFixed(2)}` : "$0.00"}</div>
          );
        },
      },
      {
        id: "balanceUsd",
        accessorKey: "balanceUsd",
        header: ({ column }: { column: Column<Project, unknown> }) => (
          <DataTableColumnHeader column={column} title="Balance" />
        ),
        cell: ({ cell }) => {
          const amount = cell.getValue<Project["balanceUsd"]>();
          return (
            <div>{amount ? `$${parseFloat(amount).toFixed(2)}` : "$0.00"}</div>
          );
        },
      },
      {
        id: "progressPercentage",
        accessorKey: "progressPercentage",
        header: ({ column }: { column: Column<Project, unknown> }) => (
          <DataTableColumnHeader column={column} title="Progress" />
        ),
        cell: ({ cell }) => {
          const progress = cell.getValue<Project["progressPercentage"]>();
          return (
            <div className="flex items-center space-x-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-600">{progress}%</span>
            </div>
          );
        },
      },
      {
        id: "actions",
        cell: function Cell({ row }) {
          const pledge = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => console.log("Edit pledge:", pledge.id)}
                >
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => console.log("Delete pledge:", pledge.id)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        size: 32,
      },
    ],
    []
  );

  const { table } = useDataTable({
    data: pledgesData?.pledges || [],
    columns,
    pageCount: pledgesData?.pledges
      ? Math.ceil(pledgesData.pledges.length / limit)
      : 1,
    initialState: {
      columnPinning: { right: ["actions"] },
    },
    getRowId: (row: any) => row.id,
  });

  if (isLoading) {
    return (
      <div className="data-table-container">
        <div className="flex items-center justify-center p-8">
          <div className="text-sm text-gray-500">Loading pledges...</div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="data-table-container">
        <div className="flex items-center justify-center p-8">
          <div className="text-sm text-red-500">
            Error loading pledges: {error?.message || "Unknown error"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="data-table-container">
      <DataTable table={table}>
        <DataTableToolbar table={table} />
      </DataTable>
    </div>
  );
}
