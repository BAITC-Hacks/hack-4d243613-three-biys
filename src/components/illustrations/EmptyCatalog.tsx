import { Frame, Led, lime, gray, type IllustrationProps } from "./shared";
export function EmptyCatalog(props: IllustrationProps) {
  return <Frame size={160} width={160} height={120} {...props}>
    
    <path d="M22 21v78h116V21M22 59h116M22 92h116"/><path d="M30 99v10M130 99v10"/><rect x="103" y="53" width="25" height="13" fill={lime}/><path d="M109 59h13"/><path d="M43 36h18M52 27v18" stroke={gray}/><Led x={119} y={22}/>
  </Frame>;
}

