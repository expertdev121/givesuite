import React, { Suspense } from "react";
import AllPledgesTable from "./_components/all-pledges";

const AllPledges = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AllPledgesTable />
    </Suspense>
  );
};

export default AllPledges;
