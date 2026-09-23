import { Frame, ink, lime, gray, type IllustrationProps } from "./shared";
export function ErrorBridge(props: IllustrationProps) {
  return <Frame size={160} width={160} height={120} {...props}>
    
    <path d="M6 76h26v28H6zM128 76h26v28h-26z" fill={ink}/><path d="M32 78h29l8 10M128 78H99l-8 10M30 69l26-23 16 9M130 69l-26-23-16 9"/><path d="m73 31 14 14m0-14L73 45" strokeWidth="3"/><rect x="47" y="79" width="10" height="8" fill={lime}/><path d="M75 101h10M72 109h16" stroke={gray}/>
  </Frame>;
}

