import React, { Suspense } from "react";
import ContactRolesTable from "@/components/contact-roles/contact-roles-client";

const AllContactRoles = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ContactRolesTable contactId={1} />
    </Suspense>
  );
};

export default AllContactRoles;
