import type { SavedPhrase, TranslationMemoryItem } from "../lib/types";

type TranslationMemoryPanelProps = {
  history: TranslationMemoryItem[];
  savedPhrases: SavedPhrase[];
  isDarkMode: boolean;
  panelClass: string;
  mutedTextClass: string;
  isPhraseSaved: (item: TranslationMemoryItem) => boolean;
  onSavePhrase: (item: TranslationMemoryItem) => boolean;
  onUseText: (text: string) => void;
  onRemoveSavedPhrase: (phraseId: string) => void;
  onMarkPhraseUsed: (phraseId: string) => void;
  onClearHistory: () => void;
  onClearSavedPhrases: () => void;
};

function getDirectionLabel(
  sourceLang: string | null,
  targetLang: string | null
): string {
  if (!sourceLang || !targetLang) return "AUTO";
  return sourceLang.toUpperCase() + " -> " + targetLang.toUpperCase();
}

function formatShortDate(value: string): string {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function TranslationMemoryPanel({
  history,
  savedPhrases,
  isDarkMode,
  panelClass,
  mutedTextClass,
  isPhraseSaved,
  onSavePhrase,
  onUseText,
  onRemoveSavedPhrase,
  onMarkPhraseUsed,
  onClearHistory,
  onClearSavedPhrases
}: TranslationMemoryPanelProps) {
  const itemClass = isDarkMode
    ? "border-slate-800 bg-slate-950/70"
    : "border-slate-200 bg-slate-50";
  const actionButtonClass =
    "rounded-lg border border-blue-500/50 px-3 py-1 text-xs font-semibold text-blue-400 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:border-slate-500 disabled:text-slate-500";
  const dangerButtonClass =
    "rounded-lg border border-red-500/50 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/10";

  return (
    <section className={"mb-4 rounded-2xl border p-4 shadow-xl " + panelClass}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Translation history</h2>
              <p className={"text-xs " + mutedTextClass}>
                {history.length}/50 items
              </p>
            </div>

            {history.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className={dangerButtonClass}
              >
                Clear
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className={"rounded-lg border p-4 text-sm " + itemClass}>
              No translation history yet.
            </div>
          ) : (
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {history.map((item) => {
                const saved = isPhraseSaved(item);

                return (
                  <article
                    key={item.id}
                    className={"rounded-lg border p-3 " + itemClass}
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="rounded-full bg-blue-500/10 px-2 py-1 font-semibold text-blue-400">
                        {getDirectionLabel(item.sourceLang, item.targetLang)}
                      </span>
                      <span className={mutedTextClass}>
                        {formatShortDate(item.createdAt)}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap text-sm font-semibold">
                      {item.originalText}
                    </p>
                    <p className={"mt-1 whitespace-pre-wrap text-sm " + mutedTextClass}>
                      {item.translatedText}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onUseText(item.originalText)}
                        className={actionButtonClass}
                      >
                        Use original
                      </button>
                      <button
                        type="button"
                        onClick={() => onUseText(item.translatedText)}
                        className={actionButtonClass}
                      >
                        Use translation
                      </button>
                      <button
                        type="button"
                        onClick={() => onSavePhrase(item)}
                        disabled={saved}
                        className={actionButtonClass}
                      >
                        {saved ? "Saved" : "Save"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Saved phrases</h2>
              <p className={"text-xs " + mutedTextClass}>
                {savedPhrases.length}/30 items
              </p>
            </div>

            {savedPhrases.length > 0 && (
              <button
                type="button"
                onClick={onClearSavedPhrases}
                className={dangerButtonClass}
              >
                Clear
              </button>
            )}
          </div>

          {savedPhrases.length === 0 ? (
            <div className={"rounded-lg border p-4 text-sm " + itemClass}>
              No saved phrases yet.
            </div>
          ) : (
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {savedPhrases.map((phrase) => (
                <article
                  key={phrase.id}
                  className={"rounded-lg border p-3 " + itemClass}
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="rounded-full bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-400">
                      {getDirectionLabel(phrase.sourceLang, phrase.targetLang)}
                    </span>
                    <span className={mutedTextClass}>
                      Used {phrase.useCount} time
                      {phrase.useCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap text-sm font-semibold">
                    {phrase.originalText}
                  </p>
                  <p className={"mt-1 whitespace-pre-wrap text-sm " + mutedTextClass}>
                    {phrase.translatedText}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onMarkPhraseUsed(phrase.id);
                        onUseText(phrase.originalText);
                      }}
                      className={actionButtonClass}
                    >
                      Use original
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onMarkPhraseUsed(phrase.id);
                        onUseText(phrase.translatedText);
                      }}
                      className={actionButtonClass}
                    >
                      Use translation
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveSavedPhrase(phrase.id)}
                      className={dangerButtonClass}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
