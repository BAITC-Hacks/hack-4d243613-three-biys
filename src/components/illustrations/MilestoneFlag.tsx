import { Frame, lime, gray, type IllustrationProps } from "./shared";
export function MilestoneFlag(props: IllustrationProps) {
  return <Frame size={160} width={160} height={120} {...props}>
    
    <path d="M16 105V81h35V59h35V37h48v68Z" fill={gray}/><path d="M95 37V9h43l-9 10 9 10H95Z" fill={lime}/><path d="m96 79 8 8 16-20" strokeWidth="3"/>
  </Frame>;
}

