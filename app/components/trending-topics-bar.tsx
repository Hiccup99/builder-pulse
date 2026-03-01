export function TrendingTopicsBar({
  topics,
  emergingTopics,
}: {
  topics: string[]
  emergingTopics?: string[]
}) {
  if (topics.length === 0 && (!emergingTopics || emergingTopics.length === 0)) return null

  return (
    <div className="mb-8 space-y-4">
      {topics.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-[#9ca3af] uppercase tracking-widest">
              Trending Today
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#f5f3ff] text-indigo-700 border border-[#ede9fe]"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {emergingTopics && emergingTopics.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-emerald-500 uppercase tracking-widest">
              ✦ Emerging
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {emergingTopics.map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
