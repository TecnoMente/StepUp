import ResumeClient from './ResumeClient';

export const dynamic = 'force-dynamic';

export default function ResumePage({ searchParams }: { searchParams: Record<string, unknown> | URLSearchParams }) {
  // searchParams may be a URLSearchParams or a plain object depending on Next's runtime.
  let sessionId: string | null = null;

  const maybeUrlSearch = searchParams as URLSearchParams;
  if (maybeUrlSearch && typeof maybeUrlSearch.get === 'function') {
    sessionId = maybeUrlSearch.get('sessionId');
  } else if (searchParams && typeof searchParams === 'object') {
    const s = (searchParams as Record<string, unknown>)['sessionId'];
    sessionId = typeof s === 'string' ? s : null;
  }

  return <ResumeClient sessionId={sessionId} />;
}
