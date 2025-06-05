"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SortField, SortOrder } from "@/types/contact";
import { Button } from "@/components/ui/button";
import { Search, SortAsc, SortDesc, X } from "lucide-react";
import { useState } from "react";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

interface ContactTableToolbarProps {
  selectedCount: number;
  onSearchChange: (search: string) => void;
  onSortChange: (field: SortField, order: SortOrder) => void;
  onClearSelected: () => void;
  sortField: SortField;
  sortOrder: SortOrder;
}

export function ContactTableToolbar({
  selectedCount,
  onSearchChange,
  onSortChange,
  onClearSelected,
  sortField,
  sortOrder,
}: ContactTableToolbarProps) {
  const [searchValue, setSearchValue] = useState("");

  const debouncedSearch = useDebouncedCallback((value: string) => {
    onSearchChange(value);
  }, 300);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    debouncedSearch(value);
  };

  const handleClearSearch = () => {
    setSearchValue("");
    onSearchChange("");
  };

  const handleSortFieldChange = (value: SortField) => {
    onSortChange(value, sortOrder);
  };

  const handleSortOrderChange = (value: SortOrder) => {
    onSortChange(sortField, value);
  };

  return (
    <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex w-full flex-col gap-4 md:w-auto md:flex-row md:items-center">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchValue}
            onChange={handleSearchChange}
            className="w-full pl-8 md:w-64"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-9 w-9 p-0"
              onClick={handleClearSearch}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedCount} selected
            </span>
            <Button variant="ghost" size="sm" onClick={onClearSelected}>
              Clear
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Select value={sortField} onValueChange={handleSortFieldChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Sort by</SelectLabel>
              <SelectItem value="lastName">Name</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="updatedAt">Updated</SelectItem>
              <SelectItem value="totalPledgedUsd">Pledged</SelectItem>
              <SelectItem value="totalPaidUsd">Paid</SelectItem>
              <SelectItem value="currentBalanceUsd">Balance</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select value={sortOrder} onValueChange={handleSortOrderChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Order</SelectLabel>
              <SelectItem value="asc" className="flex items-center gap-2">
                <SortAsc className="h-4 w-4" />
                <span>Ascending</span>
              </SelectItem>
              <SelectItem value="desc" className="flex items-center gap-2">
                <SortDesc className="h-4 w-4" />
                <span>Descending</span>
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
