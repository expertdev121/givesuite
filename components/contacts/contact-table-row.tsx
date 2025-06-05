"use client";

import { Contact } from "@/types/contact";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { format, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/utils";

interface ContactTableRowProps {
  contact: Contact;
  isSelected: boolean;
  onSelect: (contactId: number) => void;
}

export function ContactTableRow({
  contact,
  isSelected,
  onSelect,
}: ContactTableRowProps) {
  const handleSelectChange = () => {
    onSelect(contact.id);
  };

  const fullName = `${contact.firstName} ${contact.lastName}`;
  const formattedUpdatedAt = format(parseISO(contact.updatedAt), "MMM d, yyyy");

  return (
    <TableRow className={isSelected ? "bg-muted/50" : undefined}>
      <TableCell className="w-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleSelectChange}
          aria-label={`Select ${fullName}`}
        />
      </TableCell>
      <TableCell className="font-medium">{fullName}</TableCell>
      <TableCell>{contact.email || "—"}</TableCell>
      <TableCell>{contact.phone || "—"}</TableCell>
      <TableCell>{contact.roleName || "—"}</TableCell>
      <TableCell>{formattedUpdatedAt}</TableCell>
      <TableCell className="text-right">
        {formatCurrency(contact.totalPledgedUsd)}
      </TableCell>
      <TableCell className="text-right">
        {formatCurrency(contact.totalPaidUsd)}
      </TableCell>
      <TableCell className="text-right">
        {formatCurrency(contact.currentBalanceUsd)}
      </TableCell>
    </TableRow>
  );
}
