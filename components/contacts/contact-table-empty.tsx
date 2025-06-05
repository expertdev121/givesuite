import { TableCell, TableRow } from "@/components/ui/table";

interface ContactTableEmptyProps {
  colSpan: number;
  isLoading?: boolean;
  isError?: boolean;
  message?: string;
}

export function ContactTableEmpty({
  colSpan,
  isLoading = false,
  isError = false,
  message,
}: ContactTableEmptyProps) {
  const defaultMessage = isLoading
    ? "Loading contacts..."
    : isError
    ? "There was an error loading contacts."
    : "No contacts found.";

  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-24 text-center">
        <div className="flex flex-col items-center justify-center gap-2 py-8">
          {isLoading ? (
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              {isError ? "!" : "?"}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {message || defaultMessage}
          </p>
        </div>
      </TableCell>
    </TableRow>
  );
}
