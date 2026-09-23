import { Frame, lime, type IllustrationProps } from "./shared";
export function LevelReady(props: IllustrationProps) {
  return <Frame size={24} width={24} height={24} {...props}>
    
    <rect x="3" y="3" width="18" height="18" fill={lime}/><path d="m6 12 4 4 8-9"/>
  </Frame>;
}

