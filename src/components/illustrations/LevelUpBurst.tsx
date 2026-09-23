import { Frame, lime, type IllustrationProps } from "./shared";
export function LevelUpBurst(props: IllustrationProps) {
  return <Frame size={160} width={160} height={120} {...props}>
    <style>{`.kp-burst-square{animation:kp-burst-out .8s ease-out both}@keyframes kp-burst-out{0%{transform:scale(.05);opacity:0}25%{opacity:1}100%{transform:scale(1);opacity:0}}`}</style>
    <path d="m62 73 18-25 18 25M80 48v47" strokeWidth="3"/>{Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return <rect key={i} className="kp-motion kp-burst-square" x={77+Math.cos(a)*45} y={57+Math.sin(a)*45} width="6" height="6" fill={lime} stroke="none" style={{transformOrigin:"80px 60px"}}/>;})}
  </Frame>;
}

