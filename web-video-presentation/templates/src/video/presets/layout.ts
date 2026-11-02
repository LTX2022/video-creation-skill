import type { Box, PresetLayout, ThemePresetSpec } from './types';

export function presetLayout(spec: ThemePresetSpec, width: number, height: number, subtitleVisible = false, title?: string): PresetLayout {
  if (![width, height].every(n => Number.isFinite(n) && n > 0)) throw new RangeError('Preset dimensions must be finite positive numbers');
  const portrait = height > width;
  const unit = Math.min(width / 1200, height / 675);
  const box = (x:number,y:number,w:number,h:number): Box => ({x:x*width,y:y*height,width:w*width,height:h*height});
  const bottom = portrait ? (subtitleVisible ? .58 : .78) : (subtitleVisible ? .78 : .88);
  const top = .07;
  const fullStage = ['gallery','archive','kinetic','audio'].includes(spec.family);
  const center = fullStage || spec.layout.heroSide === 'center' || (title !== undefined && [...title].length > 26);
  const flipped = spec.layout.heroSide === 'right';
  let heading: Box, subject: Box, footer: Box;
  if (portrait) {
    heading = box(.07, top, .86, .165);
    subject = box(.07, .255, .86, bottom - .255 - .065);
    footer = box(.07, bottom-.045, .86, .04);
  } else if (center) {
    heading = box(.07, top, .86, fullStage ? .15 : .19);
    const subjectTop=fullStage ? .25 : .31;
    subject = box(.07, subjectTop, .86, bottom-subjectTop-.075);
    footer = box(.07,bottom-.045,.86,.04);
  } else {
    heading = box(flipped ? .655 : .07, .14, .275, bottom-.14-.08);
    subject = box(flipped ? .07 : .385, .12, .545, bottom-.12-.07);
    footer = box(.07,bottom-.042,.86,.036);
  }
  return {
    width,height,portrait,headingMode: portrait || center ? 'top' : 'side',unit,content:box(.07,top,.86,bottom-top),heading,subject,footer,
    subtitleBand: subtitleVisible ? (portrait ? box(.08,.60,.84,.13) : box(.06,.80,.88,.14)) : null,
    platformBand: portrait ? box(0,.82,1,.18) : null,
    titleSize: (portrait ? 54 : center ? 49 : 45)*unit*spec.layout.titleScale,
    bodySize: (portrait ? 23 : 20)*unit,
    labelSize: (portrait ? 20 : 16)*unit,
  };
}
export function within(inner: Box, outer: Box, epsilon = .001): boolean {
  return inner.x >= outer.x-epsilon && inner.y >= outer.y-epsilon && inner.x+inner.width <= outer.x+outer.width+epsilon && inner.y+inner.height <= outer.y+outer.height+epsilon;
}
export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y;
}
