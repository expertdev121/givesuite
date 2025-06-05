"use client";
import { motion } from "motion/react";
import { Tab } from "@/hooks/useTabs";
import FinancialSummaryTab from "./Financial-Summary-Tab";
import { Contact, ContactRole, StudentRole } from "@/lib/db/schema";
import ContactOverviewTab from "./Contact-Overview-Tab";
import { Category } from "@/lib/query/useContactCategories";

interface ContactWithRoles extends Contact {
  contactRoles: ContactRole[];
  studentRoles: StudentRole[];
}

interface FinancialSummary {
  totalPledgedUsd: number;
  totalPaidUsd: number;
  currentBalanceUsd: number;
}

interface TabContentProps {
  tab: Tab;
  contact: ContactWithRoles;
  financialSummary: FinancialSummary;
  categories: Category[];
}

const transition = {
  type: "tween",
  ease: "easeOut",
  duration: 0.15,
};

const TabContent: React.FC<TabContentProps> = ({
  tab,
  contact,
  financialSummary,
  categories,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={transition}
      className="p-6 rounded-lg mt-4 min-h-[55vh]"
    >
      {tab.value === "contact-overview" && (
        <ContactOverviewTab
          contact={contact}
          financialSummary={financialSummary}
          categories={categories}
        />
      )}
      {tab.value === "financial-summary" && (
        <FinancialSummaryTab financialSummary={financialSummary} />
      )}
    </motion.div>
  );
};

export default TabContent;
