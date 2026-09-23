import { Frame, ink, lime, white, type IllustrationProps } from "./shared";
export function BusinessAvatar({ name, ...props }: IllustrationProps & { name: string }) {
  const letter = Array.from(name.trim().normalize("NFC"))[0]?.toLocaleUpperCase("kk-KZ") || "К";
  return <Frame size={48} width={48} height={48} {...props}>
    <rect x="1" y="1" width="46" height="46" fill={white}/>
    <text x="24" y="33" textAnchor="middle" fontSize="26" fontWeight="800" fontFamily="var(--font-sans,sans-serif)" stroke="none" fill={ink}>{letter}</text>
    <path d="M35 1h12v12H35Z" fill={lime}/>
  </Frame>;
}

