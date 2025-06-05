"use client";
import { Contact, SortField, SortOrder } from "@/types/contact";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useRef, useEffect, useCallback } from "react";
import { ContactTableRow } from "./contact-table-row";
import { ContactTableToolbar } from "./contact-table-toolbar";
import { ContactTableEmpty } from "./contact-table-empty";
import { ContactColumnHeader } from "./contact-column-header";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useContacts } from "@/lib/query/useContacts";

export function ContactTable() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("lastName");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(
    new Set()
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useContacts({
    limit: 20,
    search,
    sortBy,
    sortOrder,
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const contacts = data?.pages.flatMap((page) => page.contacts) || [];
  const totalCount = data?.pages[0]?.pagination.totalCount || 0;

  const toggleContactSelection = (contactId: number) => {
    setSelectedContacts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const clearSelectedContacts = () => {
    setSelectedContacts(new Set());
  };

  const handleSort = (field: SortField) => {
    if (field === sortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const handleSortChange = (field: SortField, order: SortOrder) => {
    setSortBy(field);
    setSortOrder(order);
  };

  const setupObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    setupObserver();
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [setupObserver]);

  return (
    <div className="w-full space-y-4">
      <ContactTableToolbar
        selectedCount={selectedContacts.size}
        onSearchChange={setSearch}
        onSortChange={handleSortChange}
        onClearSelected={clearSelectedContacts}
        sortField={sortBy}
        sortOrder={sortOrder}
      />

      <div className="rounded-md border">
        <div className="max-h-[600px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="w-10">
                  <span className="sr-only">Select</span>
                </TableHead>
                <TableHead>
                  <ContactColumnHeader
                    title="Name"
                    field="lastName"
                    sortable
                    currentSortField={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <span className="text-sm font-medium">Email</span>
                </TableHead>
                <TableHead>
                  <span className="text-sm font-medium">Phone</span>
                </TableHead>
                <TableHead>
                  <span className="text-sm font-medium">Role</span>
                </TableHead>
                <TableHead>
                  <ContactColumnHeader
                    title="Updated"
                    field="updatedAt"
                    sortable
                    currentSortField={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead className="text-right">
                  <ContactColumnHeader
                    title="Pledged"
                    field="totalPledgedUsd"
                    sortable
                    currentSortField={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                    className="justify-end"
                  />
                </TableHead>
                <TableHead className="text-right">
                  <span className="text-sm font-medium">Paid</span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="text-sm font-medium">Balance</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || isError || contacts.length === 0 ? (
                <ContactTableEmpty
                  colSpan={9}
                  isLoading={isLoading}
                  isError={isError}
                  message={
                    isLoading
                      ? "Loading contacts..."
                      : isError
                      ? "Error loading contacts."
                      : "No contacts found."
                  }
                />
              ) : (
                contacts.map((contact: Contact) => (
                  <ContactTableRow
                    key={contact.id}
                    contact={contact}
                    isSelected={selectedContacts.has(contact.id)}
                    onSelect={toggleContactSelection}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {!isLoading && !isError && contacts.length > 0 && (
        <div className="flex items-center justify-between py-4">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{contacts.length}</span> of{" "}
            <span className="font-medium">{totalCount}</span> contacts
          </div>

          {hasNextPage && (
            <div ref={loadMoreRef} className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
