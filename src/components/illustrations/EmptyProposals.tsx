import { Frame, lime, white, gray, type IllustrationProps } from "./shared";
export function EmptyProposals(props: IllustrationProps) {
  return <Frame size={160} width={160} height={120} {...props}>
    
    <path d="M31 39h88l17 20v32H31Z" fill={white}/><path d="M31 39 49 59v32M49 59h87M78 91v23"/><path d="M109 60V15h25v17h-25" fill={lime}/><path d="M63 72h32"/><path d="M17 101h126" stroke={gray}/>
  </Frame>;
}

