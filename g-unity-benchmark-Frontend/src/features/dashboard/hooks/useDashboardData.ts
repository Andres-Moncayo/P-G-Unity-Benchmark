import { useQuery } from "@tanstack/react-query";
import { getDashboardData } from "../services/dashboardService";

export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboardData,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
