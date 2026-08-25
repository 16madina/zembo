/** Content-shaped loading placeholders (native apps show skeletons, not spinners). */

const shimmer = "animate-pulse bg-muted/60";

export const SkeletonCardGrid = ({
  count = 6,
  aspect = "aspect-[3/4]",
}: {
  count?: number;
  aspect?: string;
}) => (
  <div className="grid grid-cols-2 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className={`${aspect} rounded-lg ${shimmer}`} />
    ))}
  </div>
);

export const SkeletonList = ({ count = 6 }: { count?: number }) => (
  <div className="list-group">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="list-row">
        <div className={`w-11 h-11 rounded-full flex-shrink-0 ${shimmer}`} />
        <div className="flex-1 space-y-2">
          <div className={`h-3.5 w-1/3 rounded ${shimmer}`} />
          <div className={`h-3 w-2/3 rounded ${shimmer}`} />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonBlocks = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className={`h-28 rounded-lg ${shimmer}`} />
    ))}
  </div>
);

export default SkeletonList;
