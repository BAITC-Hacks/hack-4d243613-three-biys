// Where the Windows Collector is downloaded from. No signed installer yet: the repo ZIP contains run-collector.bat,
// which installs dependencies on first run and starts the app (see README "For judges").
export const COLLECTOR_DOWNLOAD = {
  href: 'https://github.com/BAITC-Hacks/hack-4d243613-three-biys/archive/refs/heads/main.zip',
  version: '0.1.0 (Windows 10/11, Node.js 20+)',
  sizeLabel: 'Unzip and double-click run-collector.bat',
  serverUrl: 'https://taskforge-app-chi.vercel.app',
};
