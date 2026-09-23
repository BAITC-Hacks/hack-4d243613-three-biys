import { Frame, ink, lime, paper, type IllustrationProps } from "./shared";
export function TeamAvatar({ name, ...props }: IllustrationProps & { name: string }) {
  const normalized = name.trim().normalize("NFC");
  let hash = 2166136261;
  for (const c of normalized) hash = Math.imul(hash ^ c.codePointAt(0)!, 16777619) >>> 0;
  return <Frame size={48} width={48} height={48} {...props}>
    <rect x="1" y="1" width="46" height="46" fill={paper}/>
    {Array.from({length:9},(_,i)=><rect key={i} x={7+(i%3)*12} y={7+Math.floor(i/3)*12} width="10" height="10" stroke="none" fill={i===4?lime:((hash>>>i)&1)?ink:paper}/>)}
  </Frame>;
}

