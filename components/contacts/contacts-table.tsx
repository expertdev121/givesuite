"use client";

import { Contact, SortField, SortOrder } from "@/types/contact";
import { useEffect, useMemo, useCallback } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "../data-table/data-table-skeleton";
import { DataTableColumnHeader } from "../data-table/data-table-column-header";
import { parseAsString, parseAsStringEnum, parseAsArrayOf } from "nuqs";
import { useQueryState } from "nuqs";
import { useContacts } from "@/lib/query/useContacts";
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useDebounce } from "@/lib/utils";
import Link from "next/link";

const columnHelper = createColumnHelper<Contact>();

export function ContactTable() {
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("")
  );
  const [sortBy, setSortBy] = useQueryState(
    "sortBy",
    parseAsStringEnum<SortField>([
      "firstName",
      "lastName",
      "updatedAt",
      "totalPledgedUsd",
    ]).withDefault("lastName")
  );
  const [sortOrder, setSortOrder] = useQueryState(
    "sortOrder",
    parseAsStringEnum<SortOrder>(["asc", "desc"]).withDefault("asc")
  );
  const [selectedContacts, setSelectedContacts] = useQueryState(
    "selected",
    parseAsArrayOf(parseAsString, ",").withDefault([])
  );
  const [page, setPage] = useQueryState("page", parseAsString.withDefault("1"));
  const [pageSize, setPageSize] = useQueryState(
    "pageSize",
    parseAsString.withDefault("20")
  );

  const debouncedSearch = useDebounce(search, 500);

  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useContacts({
    limit: Number(pageSize),
    search: debouncedSearch,
    sortBy,
    sortOrder,
  });

  const deleteMutation = useMutation({
    mutationFn: async (contactId: number) => {
      await axios.delete(`/api/contacts/${contactId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  const handleEdit = useCallback(
    (contactId: number) => {
      router.push(`/contact/${contactId}/edit`);
    },
    [router]
  );

  const handleDelete = useCallback(
    (contactId: number) => {
      deleteMutation.mutate(contactId);
    },
    [deleteMutation]
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        id: "select",
        header: () => <span className="sr-only">Select</span>,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
              className="cursor-pointer accent-primary"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      }),
      columnHelper.accessor("lastName", {
        id: "lastName",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Name"
            className="text-sm font-semibold text-gray-700 dark:text-gray-300"
          />
        ),
        cell: (info) => (
          <Link
            href={`/contacts/${info.row.original.id}`}
            className="font-medium text-primary hover:underline hover:text-primary-dark transition-colors duration-200"
          >
            <span>{`${info.row.original.lastName}, ${info.row.original.firstName}`}</span>
          </Link>
        ),
        enableSorting: true,
        enableHiding: true,
        meta: {
          variant: "text",
          label: "Name",
          placeholder: "Search names...",
        },
        enableColumnFilter: true,
      }),
      columnHelper.accessor("email", {
        id: "email",
        header: () => (
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Email
          </span>
        ),
        cell: (info) => (
          <Link
            href={`/contacts/${info.row.original.id}`}
            className="text-primary hover:underline transition-colors duration-200"
          >
            <span
              className={
                info.getValue()
                  ? "text-gray-900 dark:text-gray-100"
                  : "text-gray-500 dark:text-gray-400 italic"
              }
            >
              {info.getValue() ?? "N/A"}
            </span>
          </Link>
        ),
        enableSorting: false,
        enableHiding: false,
      }),
      columnHelper.accessor("phone", {
        id: "phone",
        header: () => (
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Phone
          </span>
        ),
        cell: (info) => (
          <span
            className={
              info.getValue()
                ? "text-gray-900 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400 italic"
            }
          >
            {info.getValue() ?? "N/A"}
          </span>
        ),
        enableSorting: false,
        enableHiding: false,
      }),
      columnHelper.accessor("roleName", {
        id: "roleName",
        header: () => (
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Role
          </span>
        ),
        cell: (info) => (
          <span
            className={
              info.getValue()
                ? "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                : "text-gray-500 dark:text-gray-400 italic"
            }
          >
            {info.getValue() ?? "N/A"}
          </span>
        ),
        enableSorting: false,
        enableHiding: false,
      }),
      columnHelper.accessor("updatedAt", {
        id: "updatedAt",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Updated"
            className="text-sm font-semibold text-gray-700 dark:text-gray-300"
          />
        ),
        cell: (info) => (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {new Date(info.getValue()).toLocaleDateString()}
          </span>
        ),
        enableSorting: true,
        enableHiding: true,
      }),
      columnHelper.accessor("totalPledgedUsd", {
        id: "totalPledgedUsd",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Pledged"
            className="text-sm font-semibold text-gray-700 dark:text-gray-300 justify-end"
          />
        ),
        cell: (info) => (
          <span className="text-right font-mono text-gray-900 dark:text-gray-100">
            {info.getValue() != null ? `$${Number(info.getValue())}` : "N/A"}
          </span>
        ),
        enableSorting: true,
        enableHiding: true,
      }),
      columnHelper.accessor("totalPaidUsd", {
        id: "totalPaidUsd",
        header: () => <span>Paid</span>,
        cell: (info) => (
          <span
            className={`text-right font-mono ${
              info.getValue() != null && Number(info.getValue()) > 0
                ? "text-green-600 dark:text-green-400"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {info.getValue() != null ? `$${Number(info.getValue())}` : "N/A"}
          </span>
        ),
        enableSorting: false,
        enableHiding: false,
      }),
      columnHelper.accessor("currentBalanceUsd", {
        id: "currentBalanceUsd",
        header: () => <span>Balance</span>,
        cell: (info) => {
          const value = info.getValue();
          let colorClass = "text-gray-500 dark:text-gray-400";
          if (value != null) {
            const numValue = Number(value);
            if (numValue < 0) {
              colorClass = "text-red-600 dark:text-red-400";
            } else if (numValue > 0) {
              colorClass = "text-red-600 dark:text-red-400";
            }
          }
          return (
            <span className={`text-right font-mono ${colorClass}`}>
              {value != null ? `$${Number(value)}` : "N/A"}
            </span>
          );
        },
        enableSorting: false,
        enableHiding: false,
      }),
      columnHelper.display({
        id: "actions",
        header: () => (
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-right">
            Actions
          </span>
        ),
        cell: ({ row }) => {
          const contact = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleEdit(contact.id)}
                  className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleDelete(contact.id)}
                  className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        enableSorting: false,
        enableHiding: false,
        size: 80,
      }),
    ],
    [handleEdit, handleDelete]
  );

  const contacts = useMemo(
    () =>
      data?.pages.flatMap((page) =>
        page.contacts.map((contact) => ({
          ...contact,
        }))
      ) || [],
    [data]
  );
  const totalPages = data?.pages[0]?.pagination.totalPages || 1;

  const table = useReactTable({
    data: isLoading ? [] : contacts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    pageCount: totalPages,
    state: {
      sorting: [{ id: sortBy, desc: sortOrder === "desc" }],
      columnFilters: search ? [{ id: "lastName", value: search }] : [],
      pagination: {
        pageIndex: Number(page) - 1,
        pageSize: Number(pageSize),
      },
      rowSelection: Object.fromEntries(
        selectedContacts.map((id) => [id, true])
      ),
    },
    onSortingChange: (updater) => {
      const newSort =
        typeof updater === "function"
          ? updater([{ id: sortBy, desc: sortOrder === "desc" }])[0]
          : updater[0];
      if (newSort) {
        setSortBy(newSort.id as SortField);
        setSortOrder(newSort.desc ? "desc" : "asc");
      } else {
        setSortBy("lastName");
        setSortOrder("asc");
      }
      setPage("1");
    },
    onColumnFiltersChange: (updater) => {
      const newFilters =
        typeof updater === "function"
          ? updater([{ id: "lastName", value: search }])
          : updater;
      const searchFilter = newFilters.find((f) => f.id === "lastName")
        ?.value as string | undefined;
      setSearch(searchFilter ?? "");
      setPage("1");
    },
    onPaginationChange: (updater) => {
      const newPagination =
        typeof updater === "function"
          ? updater({ pageIndex: Number(page) - 1, pageSize: Number(pageSize) })
          : updater;
      setPage(String(newPagination.pageIndex + 1));
      setPageSize(String(newPagination.pageSize));
    },
    onRowSelectionChange: (updater) => {
      const newSelection =
        typeof updater === "function"
          ? updater(
              Object.fromEntries(selectedContacts.map((id) => [id, true]))
            )
          : updater;
      const selectedIds = Object.keys(newSelection).map(String);
      setSelectedContacts(selectedIds);
    },
  });

  useEffect(() => {
    setPage("1");
  }, [debouncedSearch, setPage]);

  useEffect(() => {
    if (Number(page) <= totalPages && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [page, totalPages, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="w-full space-y-4">
      {isLoading || isError ? (
        <DataTableSkeleton
          columnCount={10}
          rowCount={10}
          filterCount={1}
          cellWidths={[
            "40px",
            "auto",
            "auto",
            "auto",
            "auto",
            "auto",
            "auto",
            "auto",
            "auto",
            "80px",
          ]}
          withViewOptions={true}
          withPagination={true}
        />
      ) : (
        <DataTable
          table={table}
          actionBar={
            selectedContacts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedContacts([])}
              >
                Clear {selectedContacts.length} selected
              </Button>
            )
          }
        >
          <DataTableToolbar table={table} />
        </DataTable>
      )}
    </div>
  );
}
