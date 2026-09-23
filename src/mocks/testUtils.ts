/**
 * A testing-library text matcher that compares an element's *full* (recursive) text content,
 * whitespace-normalized. The default `getByText`/`findByText` matcher only looks at an element's
 * own direct text-node children — so text that legitimately spans multiple nested elements (e.g.
 * "Fleet · 7 ships", where the count sits in its own <span>, or "page 1 / 3", where the page
 * number does) can never be found that way, no matter how long you wait for it.
 */
export function textMatch(expected: string) {
  return (_content: string, element: Element | null) =>
    element?.textContent?.replace(/\s+/g, ' ').trim() === expected
}
