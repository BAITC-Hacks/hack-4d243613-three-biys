import { Frame, gray, type IllustrationProps } from "./shared";
export function LevelDraft(props: IllustrationProps) {
  return <Frame size={24} width={24} height={24} {...props}>
    
    <rect x="3" y="3" width="18" height="18" fill={gray}/><path d="M7 9h10M7 14h7"/>
  </Frame>;
}

