import { Frame, lime, gray, type IllustrationProps } from "./shared";
export function AiThinking(props: IllustrationProps) {
  return <Frame size={120} width={120} height={120} {...props}>
    <style>{`.kp-ai-orbit{transform-origin:60px 60px;animation:kp-ai-orbit 4.8s linear infinite}.kp-ai-scan{animation:kp-ai-scan 3.2s ease-in-out infinite}@keyframes kp-ai-orbit{to{transform:rotate(360deg)}}@keyframes kp-ai-scan{0%,100%{transform:translateY(-30px);opacity:.2}50%{transform:translateY(30px);opacity:1}}`}</style>
    <rect x="24" y="24" width="72" height="72" stroke={gray}/><g className="kp-motion kp-ai-orbit">{[[34,34],[78,34],[78,78]].map(([x,y],i)=><rect key={i} x={x} y={y} width="9" height="9" fill={lime}/>)}</g><path d="M19 60h82" stroke={lime} className="kp-motion kp-ai-scan"/><path d="M54 60h12M60 54v12"/>
  </Frame>;
}

