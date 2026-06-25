import type { ReactNode } from 'react';
import {
  getDatabaseUnavailableMessage,
  isDatabaseUnavailableError,
} from '../utils/analyticsApiErrors';

type AnalyticsChartMessageProps = {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isEmpty: boolean;
  loadingLabel: string;
  emptyLabel: string;
  loadErrorLabel: string;
  children: ReactNode;
};

export function AnalyticsChartMessage({
  isLoading,
  isError,
  error,
  isEmpty,
  loadingLabel,
  emptyLabel,
  loadErrorLabel,
  children,
}: AnalyticsChartMessageProps) {
  if (isLoading) {
    return <p className="text-gray-400 text-sm">{loadingLabel}</p>;
  }
  if (isError) {
    if (isDatabaseUnavailableError(error)) {
      return <p className="text-amber-200/90 text-sm">{getDatabaseUnavailableMessage(error)}</p>;
    }
    return <p className="text-red-400 text-sm">{loadErrorLabel}</p>;
  }
  if (isEmpty) {
    return <p className="text-gray-400 text-sm">{emptyLabel}</p>;
  }
  return <>{children}</>;
}
