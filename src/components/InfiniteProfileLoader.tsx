import { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface InfiniteProfileLoaderProps {
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
  children?: React.ReactNode;
}

export const InfiniteProfileLoader = ({
  onLoadMore,
  isLoading,
  hasMore,
  children,
}: InfiniteProfileLoaderProps) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoading) {
        onLoadMore();
      }
    },
    [onLoadMore, hasMore, isLoading]
  );

  useEffect(() => {
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: "100px",
      threshold: 0.1,
    });

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection]);

  return (
    <>
      {children}
      
      {/* Sentinel element for intersection observer */}
      <div ref={sentinelRef} className="h-4 w-full" />
      
      {/* Loading indicator */}
      {isLoading && hasMore && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center py-4"
        >
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">
            Chargement...
          </span>
        </motion.div>
      )}
      
      {/* End of list indicator */}
      {!hasMore && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center py-4"
        >
          <span className="text-sm text-muted-foreground">
            Plus de profils à afficher
          </span>
        </motion.div>
      )}
    </>
  );
};

export default InfiniteProfileLoader;
