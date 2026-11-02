import type {ChapterDef} from './types';
import MorphChapter from '../chapters/01-morph/MorphChapter';
import {narrations as morphNarrations} from '../chapters/01-morph/narrations';
export const CHAPTERS: ChapterDef[] = [{id: 'morph', title: 'One token, three treatments', narrations: morphNarrations, Component: MorphChapter}];
