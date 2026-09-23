import { Frame, lime, white, type IllustrationProps } from "./shared";
export function StepDraft(props: IllustrationProps) {
  return <Frame size={40} width={40} height={40} {...props}>
    
    <path d="M7 4h19v32H7z" fill={white}/><path d="M11 11h10M11 17h8M11 28h7"/><path d="m18 29 3-8L32 10l5 5-11 11Z" fill={lime}/><path d="m28 14 5 5"/>
  </Frame>;
}

