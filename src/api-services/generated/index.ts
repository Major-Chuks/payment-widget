import { useMutation, useQuery } from "@tanstack/react-query";

export const useApiMutation = <TData, TVariables>(
  mutationFn: (data: TVariables) => Promise<TData | undefined>,
) =>
  useMutation<TData | undefined, unknown, TVariables>({
    mutationFn,
  });

export const useApiQuery = <TData>(
  queryKey: string[],
  queryFn: () => Promise<TData | undefined>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
    refetchOnWindowFocus?: boolean;
  },
) =>
  useQuery<TData | undefined>({
    queryKey,
    queryFn,
    ...options,
  });

export * from "./usePaymentDetailsQueries";
