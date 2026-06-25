interface ChatAISummaryProps {
  title: string;
  points: string[];
}

export function ChatAISummary({ title, points }: ChatAISummaryProps) {
  return (
    <section className="w-full px-4 py-3.5">
      <header className="mb-3 flex items-center justify-center">
        <h2 className="text-[10.5px] font-semibold uppercase tracking-wider text-[#00ADEF]">{title}</h2>
      </header>

      <ul className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 xl:grid-cols-4">
        {points.map((point, index) => (
          <li key={index} className="flex gap-2 text-[13px] leading-snug text-gray-400">
            <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#00ADEF]" />
            <p>{point}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
