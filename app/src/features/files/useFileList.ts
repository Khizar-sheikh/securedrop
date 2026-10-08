import { useCallback, useRef, useState } from 'react';
import { ApiError } from '../../services/api';
import { filesApi } from '../../services/filesApi';
import type { PublicFile } from '../../types/files';

const PAGE_SIZE = 20;

const messageOf = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

export const useFileList = () => {
  const [items, setItems] = useState<PublicFile[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef(1);

  const fetchPage = useCallback(async (page: number) => {
    const result = await filesApi.list(page, PAGE_SIZE);
    return result;
  }, []);

  const refresh = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const result = await fetchPage(1);
      pageRef.current = 1;
      setItems(result.items);
      setHasMore(result.hasMore);
      setError(null);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await fetchPage(pageRef.current + 1);
      pageRef.current += 1;
      setItems((previous) => [...previous, ...result.items]);
      setHasMore(result.hasMore);
      setError(null);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore, loadingMore]);

  const prepend = useCallback((file: PublicFile) => {
    setItems((previous) => [file, ...previous.filter((item) => item.id !== file.id)]);
  }, []);

  return { items, hasMore, loading, refreshing, loadingMore, error, refresh, loadMore, prepend };
};
