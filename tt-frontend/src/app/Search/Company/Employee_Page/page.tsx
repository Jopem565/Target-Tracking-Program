'use client'

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AdminEmpView } from "./AdminEmpView";

// Obtaining data to populate each employee page
function SearchNameLoader({ children }: { children: (name: string) => React.ReactNode }) {
  const searchParams = useSearchParams();
  const searchName = searchParams.get("name") ?? "No name";
  return <>{children(searchName)}</>;
}
// Signifies loading while waiting to fetch the data
export default function AdminEmpViewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchNameLoader>
        {(searchName) => <AdminEmpView searchName={searchName} />}
      </SearchNameLoader>
    </Suspense>
  );
}
