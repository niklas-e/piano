import { createMemo } from "solid-js";

export function HighlightedText(props: { text: string; query: string }) {
  const normalizedQuery = () => props.query.trim().toLowerCase();
  const segments = createMemo(() => {
    const query = normalizedQuery();

    if (query.length === 0) {
      return [props.text];
    }

    const text = props.text;
    const lowerText = text.toLowerCase();
    const parts = [];
    let currentIndex = 0;
    let matchIndex = lowerText.indexOf(query, currentIndex);

    while (matchIndex >= 0) {
      if (matchIndex > currentIndex) {
        parts.push(text.slice(currentIndex, matchIndex));
      }

      parts.push(<mark class="search-match">{text.slice(matchIndex, matchIndex + query.length)}</mark>);
      currentIndex = matchIndex + query.length;
      matchIndex = lowerText.indexOf(query, currentIndex);
    }

    if (currentIndex < text.length) {
      parts.push(text.slice(currentIndex));
    }

    return parts;
  });

  return <>{segments()}</>;
}
