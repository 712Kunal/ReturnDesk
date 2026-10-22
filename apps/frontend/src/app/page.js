import { Suspense } from "react";
import RequestList from "@/components/RequestList";

export default function Home() {
  return (
    <Suspense fallback={<p className="text-slate-600">Loading…</p>}>
      <RequestList />
    </Suspense>
  );
}
