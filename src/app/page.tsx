import { Landing } from '@/components/domain';
import { COLLECTOR_DOWNLOAD } from '@/lib/collector-download';

export default function Home() {
  return (
    <Landing
      serverUrl={COLLECTOR_DOWNLOAD.serverUrl}
      collectorHref={COLLECTOR_DOWNLOAD.href}
      collectorVersion={COLLECTOR_DOWNLOAD.version}
      collectorSizeLabel={COLLECTOR_DOWNLOAD.sizeLabel}
    />
  );
}
