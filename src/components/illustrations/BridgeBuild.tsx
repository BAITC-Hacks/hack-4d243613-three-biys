import { Frame, ink, lime, type IllustrationProps } from "./shared";
export function BridgeBuild(props: IllustrationProps) {
  return <Frame size={160} width={160} height={120} {...props}>
    <style>{`.kp-bridge-board{animation:kp-bridge-build 4s ease-in-out infinite}.kp-bridge-arch{animation:kp-bridge-draw 4s ease-in-out infinite}@keyframes kp-bridge-build{0%,15%,100%{fill:var(--kp-gray,#E4E4E7)}35%,80%{fill:var(--accent,#84CC16)}}@keyframes kp-bridge-draw{0%{stroke-dashoffset:100}60%,100%{stroke-dashoffset:0}}`}</style>
    <path d="M4 78h27v25H4zM129 78h27v25h-27z" fill={ink}/>
<path d="M30 71Q80 8 130 71" pathLength="100" className="kp-motion kp-bridge-arch" strokeDasharray="100" />
<path d="M31 78h98M40 58v19M60 40v37M80 34v43M100 40v37M120 58v19" strokeWidth="2"/>
{Array.from({length:10},(_,i)=><rect key={i} className="kp-motion kp-bridge-board" x={32+i*9.6} y="78" width="8" height="8" fill={lime} style={{animationDelay:`${i*.16}s`}}/>)}
<text x="4" y="116" fontSize="10" fill={ink} stroke="none">business</text><text x="112" y="116" fontSize="10" fill={ink} stroke="none">students</text>
  </Frame>;
}

