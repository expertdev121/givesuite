import React, { Suspense } from "react";
import StudentRolesTable from "@/components/student-roles/student-roles-client";

const AllPledges = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StudentRolesTable contactId={1} />
    </Suspense>
  );
};

export default AllPledges;
