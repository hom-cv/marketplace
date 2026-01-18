/**
 * useInfiniteScroll - Hook for infinite scroll with IntersectionObserver
 * Used by explore pages to load more posts when scrolling
 */

import { useEffect, useRef, useCallback } from "react";

interface UseInfiniteScrollOptions {
  /** Whether there are more pages to load */
  hasNextPage: boolean;
  /** Whether currently fetching */
  isFetchingNextPage: boolean;
  /** Function to fetch next page */
  fetchNextPage: () => void;
  /** Root margin for intersection observer (default: "100px") */
  rootMargin?: string;
}

/**
 * Hook that returns a ref to attach to a sentinel element for infinite scroll
 */
export function useInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = "100px",
}: UseInfiniteScrollOptions) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin,
      threshold: 0,
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver, rootMargin]);

  return loadMoreRef;
}
