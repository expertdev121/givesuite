import { Tab } from "@/hooks/useTabs";
import { motion } from "motion/react";
import ContactOverviewTab from "./Contact-Overview-Tab";
import { Contact, ContactRole, StudentRole } from "@/lib/db/schema";
import FinancialSummaryTab from "./Financial-Summary-Tab";

interface ContactWithRoles extends Contact {
  contactRoles: ContactRole[];
  studentRoles: StudentRole[];
}

interface FinancialSummary {
  totalPledgedUsd: number;
  totalPaidUsd: number;
  currentBalanceUsd: number;
}

const transition = {
  type: "tween",
  ease: "easeOut",
  duration: 0.15,
};

interface TabContentProps {
  tab: Tab;
  contact: ContactWithRoles;
  financialSummary: FinancialSummary;
}
const TabContent: React.FC<TabContentProps> = ({
  tab,
  contact,
  financialSummary,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={transition}
      className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-lg mt-4 min-h-[55vh]"
    >
      {tab.value === "contact-overview" && (
        <ContactOverviewTab
          contact={contact}
          financialSummary={financialSummary}
        />
      )}
      {tab.value === "financial-summary" && (
        <FinancialSummaryTab financialSummary={financialSummary} />
      )}
    </motion.div>
  );
};

export default TabContent;
