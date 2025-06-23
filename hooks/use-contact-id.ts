import { usePathname } from "next/navigation";

const useContactId = (): number | null => {
  const pathname = usePathname();
  const contactId = pathname.match(/\/contacts\/(\d+)/)?.[1];

  return contactId ? Number(contactId) : null;
};

export default useContactId;
