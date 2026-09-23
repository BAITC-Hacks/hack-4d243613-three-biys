import { Frame, Led, ink, lime, type IllustrationProps } from "./shared";
export function HeroPulse(props: IllustrationProps) {
  return <Frame size={160} width={160} height={160} {...props}>
    <style>{`.kp-hero-wave{transform-origin:80px 80px;animation:kp-hero-expand 3.6s ease-out infinite}@keyframes kp-hero-expand{0%{transform:scale(.4);opacity:.8}100%{transform:scale(2.25);opacity:0}}`}</style>
    {[0,1,2].map(i => <rect key={i} className="kp-motion kp-hero-wave" x="48" y="48" width="64" height="64" stroke={lime} strokeWidth="3" opacity={0.6-i*0.15} style={{animationDelay:`${-i*1.2}s`,transform:`scale(${1+i*0.5})`}} />)}
<path d="M72 80h16M80 72v16" stroke={ink}/><Led x={77} y={77}/>
  </Frame>;
}

