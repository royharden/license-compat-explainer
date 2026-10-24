import type { VerifiedQuote } from '@core/quotecheck/check.ts';
import { recheckQuote } from '@core/quotecheck/check.ts';
import type { Passage } from '@core/quotecheck/segment.ts';
export function QuoteView({ quote, passages }: { quote: VerifiedQuote; passages: readonly Passage[] }) {
  if (!recheckQuote(quote, passages)) return <p role="status">Quote withheld: canonical passage verification failed.</p>;
  return <figure><blockquote>{quote.text}</blockquote><figcaption><code>{quote.passage_id}</code> · canonical vendored span</figcaption></figure>;
}
