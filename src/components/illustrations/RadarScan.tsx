import { Frame, Led, ink, lime, type IllustrationProps } from "./shared";
export function RadarScan(props: IllustrationProps) {
  return <Frame size={160} width={160} height={160} {...props}>
    <style>{`.kp-radar-ray{transform-origin:80px 80px;animation:kp-radar-turn 8s linear infinite}.kp-radar-dot{animation:kp-radar-blink 4s ease-in-out infinite}@keyframes kp-radar-turn{to{transform:rotate(360deg)}}@keyframes kp-radar-blink{50%{opacity:.2}}`}</style>
    <rect x="2" y="2" width="156" height="156" fill={ink}/>
<g stroke={lime} opacity=".3"><circle cx="80" cy="80" r="60"/><circle cx="80" cy="80" r="40"/><circle cx="80" cy="80" r="20"/><path d="M20 80h120M80 20v120"/></g>
<g className="kp-motion kp-radar-ray"><path d="M80 80V20L103 25Z" fill={lime} opacity=".15" stroke="none"/><path d="M80 80V20" stroke={lime}/></g>
{[[49,47],[107,66],[63,111]].map(([x,y],i)=><rect key={i} className="kp-motion kp-radar-dot" x={x} y={y} width="6" height="6" fill={lime} stroke="none" style={{animationDelay:`${i*1.3}s`}}/>)}<Led x={77} y={77}/>
  </Frame>;
}

