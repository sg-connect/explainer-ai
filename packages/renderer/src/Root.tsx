import React from 'react';
import { Composition, staticFile } from 'remotion';
import { Reel, ReelProps } from './Reel';
import { Explainer } from './explainer/Explainer';
import { ExplainerProps } from './explainer/types';

// The reel being rendered is whatever ../render.sh copied into public/reel/:
// script.json, timeline.json and vo.wav. Length comes from the timeline.
export const Root: React.FC = () => (
  <>
  <Composition
    id="Reel"
    component={Reel}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={300}
    defaultProps={{} as ReelProps}
    calculateMetadata={async () => {
      const [script, timeline] = await Promise.all([
        fetch(staticFile('reel/script.json')).then((r) => r.json()),
        fetch(staticFile('reel/timeline.json')).then((r) => r.json()),
      ]);
      return { durationInFrames: timeline.totalFrames, props: { script, timeline } };
    }}
  />
  {/* ByteByteGo-style explainer: ../render-explainer.sh copies storyboard.json,
      timeline.json and vo.wav into public/explainer/. */}
  <Composition
    id="Explainer"
    component={Explainer}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={300}
    defaultProps={{} as ExplainerProps}
    calculateMetadata={async () => {
      const [story, timeline] = await Promise.all([
        fetch(staticFile('explainer/storyboard.json')).then((r) => r.json()),
        fetch(staticFile('explainer/timeline.json')).then((r) => r.json()),
      ]);
      return { durationInFrames: timeline.totalFrames, props: { story, timeline } };
    }}
  />
  </>
);
