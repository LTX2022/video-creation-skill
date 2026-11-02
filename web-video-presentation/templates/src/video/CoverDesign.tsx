import React from 'react';
import type { CoverBrief, CoverShape, CoverTextBox } from './cover-types';

function TextBlock({ text, box, color }: { text: string; box: CoverTextBox; color: string }) {
  const lines = box.lines ?? [text];
  const align = box.align ?? 'left';
  const x = box.x + (align === 'center' ? box.width / 2 : align === 'right' ? box.width : 0);
  return <text fill={color} fontSize={box.fontSize} fontWeight={box.fontWeight ?? 800}
    textAnchor={align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start'} xmlSpace="preserve">
    {lines.map((line, index) => <tspan key={index} x={x} y={box.y + box.fontSize * (0.9 + index * (box.lineHeight ?? 1.15))}>{line}</tspan>)}
  </text>;
}
function Shape({ shape }: { shape: CoverShape }) {
  const { type, text, ...props } = shape;
  if (type === 'rect') return <rect {...props} />;
  if (type === 'circle') return <circle {...props} />;
  if (type === 'line') return <line {...props} />;
  if (type === 'path') return <path {...props} />;
  return <text {...props} xmlSpace="preserve">{text}</text>;
}
/** Pure SVG: same design can be server-rendered for review; this is not proof of a browser render. */
export function CoverDesign({ brief, assetHref }: { brief: CoverBrief; assetHref?: string }) {
  const v = brief.layout.visual;
  return <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"
    width={brief.width} height={brief.height} viewBox={`0 0 ${brief.width} ${brief.height}`}
    role="img" aria-label={brief.title} style={{ fontFamily: brief.fontFamily ?? 'Noto Sans CJK SC, Noto Sans SC, sans-serif' }}>
    <rect width={brief.width} height={brief.height} fill={brief.palette.background} />
    {brief.mode === 'complete-image' ? <image href={assetHref} xlinkHref={assetHref} width={brief.width} height={brief.height} preserveAspectRatio="none" /> : <>
      {brief.visual.kind === 'image' ? <image href={assetHref} xlinkHref={assetHref} x={v.x} y={v.y} width={v.width} height={v.height}
        preserveAspectRatio={brief.visual.asset.fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'} /> :
        <svg x={v.x} y={v.y} width={v.width} height={v.height} viewBox="0 0 1000 1000" overflow="hidden" preserveAspectRatio="xMidYMid meet">
          {brief.visual.shapes.map((shape, index) => <Shape key={index} shape={shape} />)}
        </svg>}
      <TextBlock text={brief.title} box={brief.layout.title} color={brief.palette.foreground} />
      {brief.subtitle && brief.layout.subtitle ? <TextBlock text={brief.subtitle} box={brief.layout.subtitle} color={brief.palette.muted} /> : null}
    </>}
  </svg>;
}
