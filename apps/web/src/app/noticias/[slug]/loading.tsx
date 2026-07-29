import { Skeleton } from "@/components/ui/skeleton";

export default function ArticleLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Skeleton className="mb-4 h-5 w-40" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="mt-2 h-9 w-2/3" />
      <Skeleton className="mt-6 aspect-video w-full" />
      <Skeleton className="mt-6 h-24 w-full" />
    </div>
  );
}
