import { Frame, yellow, type IllustrationProps } from "./shared";
export function LevelWorking(props: IllustrationProps) {
  return <Frame size={24} width={24} height={24} {...props}>
    
    <rect x="3" y="3" width="18" height="18" fill={yellow}/><path d="M8 7v10M12 7v10M16 7v10"/>
  </Frame>;
}

