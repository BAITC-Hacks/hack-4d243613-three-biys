import { Frame, lime, white, type IllustrationProps } from "./shared";
export function StepQuestions(props: IllustrationProps) {
  return <Frame size={40} width={40} height={40} {...props}>
    
    <path d="M4 5h32v24H17l-8 7v-7H4Z" fill={white}/><path d="M16 13v-2h8v6l-4 3v3"/><rect x="19" y="25" width="3" height="3" fill={lime} stroke="none"/>
  </Frame>;
}

