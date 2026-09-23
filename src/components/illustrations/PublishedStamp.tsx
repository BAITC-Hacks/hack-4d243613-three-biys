import { Frame, ink, lime, type IllustrationProps } from "./shared";
export function PublishedStamp(props: IllustrationProps) {
  return <Frame size={160} width={160} height={120} {...props}>
    <style>{`.kp-published-stamp{transform-origin:80px 60px;animation:kp-published-hit .65s ease-out both}@keyframes kp-published-hit{0%{opacity:0;transform:scale(1.45) rotate(-8deg)}60%{opacity:1;transform:scale(.96) rotate(2deg)}100%{transform:scale(1) rotate(0)}}`}</style>
    <g className="kp-motion kp-published-stamp"><rect x="13" y="32" width="134" height="56" fill={lime} strokeWidth="3"/><rect x="19" y="38" width="122" height="44"/><text x="80" y="69" textAnchor="middle" fontSize="23" fontWeight="800" fontFamily="var(--font-display, sans-serif)" fill={ink} stroke="none">ДАЙЫН</text></g>
  </Frame>;
}

