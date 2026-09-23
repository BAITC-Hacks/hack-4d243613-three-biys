import { Frame, lime, type IllustrationProps } from "./shared";
export function StepPublish(props: IllustrationProps) {
  return <Frame size={40} width={40} height={40} {...props}>
    
    <path d="M10 36V4M5 36h15"/><path d="M10 5h25l-6 8 6 8H10Z" fill={lime}/>
  </Frame>;
}

