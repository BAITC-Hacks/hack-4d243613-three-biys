import { Frame, ink, lime, type IllustrationProps } from "./shared";
export function LevelPriority(props: IllustrationProps) {
  return <Frame size={24} width={24} height={24} {...props}>
    
    <rect x="3" y="3" width="18" height="18" fill={ink}/><path d="m7 14 5-6 5 6M12 8v10" stroke={lime}/>
  </Frame>;
}

