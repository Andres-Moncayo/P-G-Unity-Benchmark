type AnalyticsDatabaseBannerProps = {
  message: string;
};

export function AnalyticsDatabaseBanner({ message }: AnalyticsDatabaseBannerProps) {
  return (
    <div
      role="alert"
      className="mb-4 rounded-lg border border-amber-700/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-100"
    >
      <p className="font-medium text-amber-200">Database unavailable</p>
      <p className="mt-1 text-amber-100/90">{message}</p>
    </div>
  );
}
