import { Frame, lime, type IllustrationProps } from "./shared";
export function StepRating(props: IllustrationProps) {
  return <Frame size={40} width={40} height={40} {...props}>
    
    <path d="M5 34V24h7v10M16 34V17h7v17M27 34V10h7v24" fill={lime}/><path d="m5 18 23-13M20 5h9v9"/>
  </Frame>;
}

