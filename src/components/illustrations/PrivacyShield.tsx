import { Frame, ink, lime, white, gray, type IllustrationProps } from "./shared";
export function PrivacyShield(props: IllustrationProps) {
  return <Frame size={160} width={160} height={120} {...props}>
    <style>{`.kp-privacy-dot{animation:kp-privacy-hide 5s ease-in-out infinite}.kp-privacy-square{animation:kp-privacy-show 5s ease-in-out infinite}@keyframes kp-privacy-hide{0%,20%,100%{opacity:1}45%,80%{opacity:0}}@keyframes kp-privacy-show{0%,20%,100%{opacity:0}45%,80%{opacity:1}}`}</style>
    <path d="m80 9 48 17v39L80 109 32 65V26Z" fill={white}/><path d="M80 19v78" stroke={gray} strokeDasharray="3 5"/>{[[53,39],[69,53],[53,69]].map(([x,y],i)=><g key={i}><circle className="kp-motion kp-privacy-dot" cx={x} cy={y} r={3+i} fill={ink}/><rect className="kp-motion kp-privacy-square" x={x-4} y={y-4} width="8" height="8" fill={lime} opacity="0"/></g>)}<path d="m88 58 8-8-8-8"/>{[35,53,71].map(y=><rect key={y} x="104" y={y} width="8" height="8" fill={lime}/>)} 
  </Frame>;
}

