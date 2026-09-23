import { Landing } from '@/components/domain';

// HACK: hosted demo URL shown in the Collector section; no Collector installer is published yet (collectorHref omitted).
const SERVER_URL = 'https://taskforge-app-chi.vercel.app';

export default function Home() {
  return <Landing serverUrl={SERVER_URL} />;
}
