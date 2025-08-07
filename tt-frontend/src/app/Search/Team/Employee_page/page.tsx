'use client'

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TLEmpView } from "./TLEmpView";

//populating the data for each employee page
function SearchNameLoader({ children }: { children: (name: string) => React.ReactNode }) {
  const searchParams = useSearchParams();
  const searchName = searchParams.get("name") ?? "No name";
  return <>{children(searchName)}</>;
}

// signifies loading while fetching the data 
export default function LindaEmpViewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchNameLoader>
        {(searchName) => <TLEmpView searchName={searchName} />}
      </SearchNameLoader>
    </Suspense>
  );
}
