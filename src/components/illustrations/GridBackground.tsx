"use client";
import { useId } from "react";
import type { IllustrationProps } from "./shared";
import { ink } from "./shared";
export function GridBackground({className, size, title}: IllustrationProps) {
  const id = `kp-grid-${useId().replace(/:/g,"")}`;
  return <div className={className} role={title?"img":undefined} aria-label={title || undefined} aria-hidden={title?undefined:true} style={{width:size??"100%",height:size??"100%",minHeight:22,position:"relative",overflow:"hidden",pointerEvents:"none"}}>
    <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" aria-hidden="true" style={{position:"absolute",inset:0}}>
      <defs><pattern id={id} width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke={ink} strokeOpacity=".06" strokeWidth="1"/></pattern></defs>
      <rect width="100%" height="100%" fill={`url(#${id})`}/>
    </svg>
  </div>;
}

