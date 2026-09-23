import { Frame, Led, lime, white, gray, type IllustrationProps } from "./shared";
export function EmptyTasks(props: IllustrationProps) {
  return <Frame size={160} width={160} height={120} {...props}>
    
    <path d="M38 12h62l17 17v77H38Z" fill={white}/><path d="M100 12v17h17"/><path d="m86 88 4-15 34-34 10 10-34 34Z" fill={lime}/><path d="m118 45 10 10M86 88l14-5"/><path d="M49 45h28M49 54h18" stroke={gray}/><Led x={48} y={23}/>
  </Frame>;
}

