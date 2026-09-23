import { Frame, lime, white, type IllustrationProps } from "./shared";
export function StepCard(props: IllustrationProps) {
  return <Frame size={40} width={40} height={40} {...props}>
    
    <rect x="4" y="6" width="32" height="28" fill={white}/><path d="M4 6h32v8H4z" fill={lime}/><path d="M9 21h22M9 27h14"/>
  </Frame>;
}

