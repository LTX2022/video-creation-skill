import React from 'react';
import { Composition } from 'remotion';
import { CoverDesign } from './CoverDesign';
import type { CoverBrief } from './cover-types';
import '../styles/fonts.css';

export type CoverProps = { brief: CoverBrief | null; assetHref: string | null };
const Cover = ({brief, assetHref}: CoverProps) => {
  if (!brief) throw new Error('Cover requires validated input props; use cover:generate --brief.');
  return <CoverDesign brief={brief} assetHref={assetHref ?? undefined} />;
};
export function CoverRoot() {
  // Keep historical composition id for existing command integrations; it no longer imposes a platform or aspect ratio.
  // Mutable design/embedded image bytes live in output/cover, never video src/public.
  return <Composition id="douyin-cover" component={Cover} fps={30} durationInFrames={1}
    defaultProps={{brief: null, assetHref: null} as CoverProps}
    calculateMetadata={({props}) => {
      if (!props.brief) throw new Error('Cover requires validated input props; use cover:generate --brief.');
      return {width: props.brief.width, height: props.brief.height};
    }} />;
}
