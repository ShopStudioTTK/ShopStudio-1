import { Wordmark } from "@/components/brand";

export const Loader = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
    <Wordmark className="text-[32px]" />
    <div className="h-0.5 w-24 overflow-hidden rounded-full bg-secondary">
      <div className="h-full w-1/2 animate-pulse rounded-full bg-rose" />
    </div>
  </div>
);
