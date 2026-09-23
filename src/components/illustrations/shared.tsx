import type { ReactNode } from "react";
export type IllustrationProps = { className?: string; size?: number; animated?: boolean; title?: string };
export const ink = "var(--foreground,#18181B)";
export const lime = "var(--accent,#84CC16)";
export const paper = "var(--background,#F7F7F5)";
export const white = "var(--kp-white,#FFFFFF)";
export const gray = "var(--kp-gray,#E4E4E7)";
export const yellow = "var(--kp-working,#FDE047)";
export function Frame({ className, size = 160, animated = true, title, children, width = 160, height = 120 }: IllustrationProps & { children: ReactNode; width?: number; height?: number }) {
  return <svg xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size * height / width} viewBox={`0 0 ${width} ${height}`} fill="none" stroke={ink} strokeWidth="2" strokeLinejoin="miter" role={title ? "img" : undefined} aria-label={title || undefined} aria-hidden={title ? undefined : true} data-kp-motion={animated ? "on" : "off"}>
    {title && <title>{title}</title>}
    <style>{`svg[data-kp-motion="off"] .kp-motion{animation:none!important}
    @media(prefers-reduced-motion:reduce){svg .kp-motion{animation:none!important}}`}</style>
    {children}
  </svg>;
}
export function Led({ x, y }: { x: number; y: number }) {
  return <rect x={x} y={y} width="6" height="6" fill={lime} stroke="none" style={{filter:`drop-shadow(0 0 3px ${lime})`}} />;
}

