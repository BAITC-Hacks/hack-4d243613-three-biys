import { Frame, Led, ink, lime, paper, white, gray, type IllustrationProps } from "./shared";
export function CollectorLaptop(props: IllustrationProps) {
  return <Frame size={160} width={160} height={120} {...props}>
    
    <rect x="24" y="15" width="112" height="76" fill={ink}/><rect x="30" y="21" width="100" height="64" fill={paper}/><path d="M24 91 10 105h140l-14-14Z" fill={white}/><path d="M66 99h28"/>{[0,1,2].map(i=><g key={i}><path d={`M42 ${35+i*17}h35`}/><rect x="91" y={29+i*17} width="25" height="10" fill={gray}/><rect x={i===1?91:106} y={29+i*17} width="10" height="10" fill={i===1?white:lime}/></g>)}<Led x={119} y={24}/>
  </Frame>;
}

