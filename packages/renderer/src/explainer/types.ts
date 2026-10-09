// Shapes of explainers/<name>/storyboard.json and the timeline.json that
// tts/make_narration.py writes next to it.

export type Tone = 'purple' | 'blue' | 'teal' | 'yellow' | 'gray' | 'orange' | 'green';
export type Kind = 'client' | 'service' | 'db' | 'queue' | 'render' | 'cloud';

// `icon` replaces the generic glyph with public/icons/<icon>.svg (Azure
// service icons, product logos); `tech` adds small logo badges to the card.
export type DNode = {
  id: string; kind: Kind; label: string; sub?: string; tone: Tone; x: number; y: number;
  icon?: string; tech?: string[];
};
export type DEdge = { id: string; from: string; to: string; step?: number; dashed?: boolean; bend?: number };

// A labelled boundary drawn around its members: "Azure", "AKS cluster", "MongoDB Atlas".
export type DGroup = {
  id: string; label: string; icon?: string; members: string[]; color: string;
  pad?: number; padTop?: number; dashed?: boolean;
};

export type Principle = { name: string; text: string };

// One thing that happens on screen. `at` anchors it to a spoken word of the
// beat ("ads", or "Service#2" for the second one); without it, the beat start.
export type Action = {
  at?: string;
  delay?: number;
  title?: boolean;
  overview?: boolean;
  show?: string[];
  draw?: string;
  group?: string[];          // reveal infrastructure boundaries
  packet?: string;
  label?: string;
  dur?: number;
  count?: number;            // send a stream of `count` packets, staggered
  focus?: string[] | 'all';
  spot?: string[] | null;
  chip?: string;
  note?: string;
  text?: string | null;
  tone?: 'amber' | 'green' | 'red' | 'blue'; // amber spins (in progress), blue is info
  principle?: Principle;     // "system design principle" card for the rest of the beat
  recap?: string[];
  recapAt?: string[];        // spoken word that brings in each recap line
  outro?: { next?: string }; // closing card: every principle shown, plus what's next
};

export type Beat = { say: string; do?: Action[]; holdSeconds?: number; pauseAfter?: number };

export type Storyboard = {
  title: string;
  subtitle?: string;
  series?: string;
  captions?: boolean;
  captionFix?: Record<string, string>; // spoken spelling → written form, for captions
  diagram: { nodes: DNode[]; edges: DEdge[]; groups?: DGroup[] };
  beats: Beat[];
};

export type Word = { w: string; start: number; end: number };
export type Timeline = { fps: number; totalFrames: number; beats: { start: number; speechEnd: number; end: number; words: Word[] }[] };

export type ExplainerProps = { story: Storyboard; timeline: Timeline };
