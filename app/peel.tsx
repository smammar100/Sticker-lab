'use client'

// Exact sticker-peel effect ported from the provided CodePen
// (codepen.io/BalintFerenczy/pen/GgppbLQ): a hover/active clip-path peel with a
// folded-over flap (grey paper backing), a soft shadow, and the original spring
// easing curves. Class names are namespaced `wsticker-*`. The artwork is our
// composed sticker SVG so the peel matches the live sticker styling.

export const PEEL_CSS = `
.wsticker{
  --sticker-p:8px;
  --sticker-peelback-hover:28%;
  --sticker-peelback-active:58%;
  --sticker-peel-easing:2s linear(0, 0.002 0.4%, 0.008 0.9%, 0.02 1.4%, 0.035 1.9%, 0.055 2.4%, 0.083 3%, 0.11 3.5%, 0.146 4.1%, 0.214 5.1%, 0.297 6.2%, 0.624 10.2%, 0.756 11.9%, 0.821 12.8%, 0.874 13.6%, 0.93 14.5%, 0.975 15.3%, 1.016 16.1%, 1.053 16.9%, 1.085 17.7%, 1.116 18.6%, 1.139 19.4%, 1.16 20.3%, 1.176 21.2%, 1.187 22.1%, 1.195 23.2%, 1.197 24.4%, 1.193 25.6%, 1.183 26.9%, 1.17 28.1%, 1.153 29.4%, 1.055 35.6%, 1.031 37.3%, 1.012 38.8%, 0.994 40.6%, 0.98 42.3%, 0.97 44.1%, 0.964 45.9%, 0.961 48.3%, 0.964 51.1%, 0.97 53.7%, 0.997 62.7%, 1.003 66%, 1.007 69.3%, 1.007 74.4%, 1 89.2%, 1);
  --sticker-peel-hover-easing:1s linear(0, 0.008 1.1%, 0.031 2.2%, 0.129 4.8%, 0.257 7.2%, 0.671 14.2%, 0.789 16.5%, 0.881 18.6%, 0.957 20.7%, 1.019 22.9%, 1.063 25.1%, 1.094 27.4%, 1.114 30.7%, 1.112 34.5%, 1.018 49.9%, 0.99 59.1%, 1);
  --sticker-start:calc(-1 * var(--sticker-p));
  --sticker-end:calc(100% + var(--sticker-p));
  /* Peel originates from the top-left corner: rotate the rig, keep art upright. */
  --peel-angle:-42deg;
  position:relative;
  cursor:pointer;
  transform:rotate(var(--peel-angle));
}
.wsticker *{ -webkit-user-select:none; user-select:none; }
.wsticker-upright{ width:100%; height:100%; transform:rotate(calc(-1 * var(--peel-angle))); }
.wsticker [data-svg]{ width:100%; height:100%; }
.wsticker [data-svg]>svg{ width:100%; height:100%; display:block; }
.wsticker-main{
  width:100%; height:100%;
  clip-path:polygon(var(--sticker-start) var(--sticker-start), var(--sticker-end) var(--sticker-start), var(--sticker-end) var(--sticker-end), var(--sticker-start) var(--sticker-end));
  transition:clip-path var(--sticker-peel-hover-easing);
}
.wsticker:hover .wsticker-main{
  clip-path:polygon(var(--sticker-start) var(--sticker-peelback-hover), var(--sticker-end) var(--sticker-peelback-hover), var(--sticker-end) var(--sticker-end), var(--sticker-start) var(--sticker-end));
  transition:clip-path var(--sticker-peel-hover-easing);
}
.wsticker:active .wsticker-main{
  clip-path:polygon(var(--sticker-start) var(--sticker-peelback-active), var(--sticker-end) var(--sticker-peelback-active), var(--sticker-end) var(--sticker-end), var(--sticker-start) var(--sticker-end));
  transition:clip-path var(--sticker-peel-easing);
}
.wsticker-flap{
  position:absolute; left:0; top:calc(-100% - var(--sticker-p) - var(--sticker-p));
  width:100%; height:100%;
  clip-path:polygon(var(--sticker-start) var(--sticker-start), var(--sticker-end) var(--sticker-start), var(--sticker-end) var(--sticker-start), var(--sticker-start) var(--sticker-start));
  transform:scaleY(-1);
  transition:all var(--sticker-peel-hover-easing);
}
.wsticker:hover .wsticker-flap{
  clip-path:polygon(var(--sticker-start) var(--sticker-start), var(--sticker-end) var(--sticker-start), var(--sticker-end) var(--sticker-peelback-hover), var(--sticker-start) var(--sticker-peelback-hover));
  top:calc(-100% + 2 * var(--sticker-peelback-hover) - 1px);
  transition:all var(--sticker-peel-hover-easing);
}
.wsticker:active .wsticker-flap{
  clip-path:polygon(var(--sticker-start) var(--sticker-start), var(--sticker-end) var(--sticker-start), var(--sticker-end) var(--sticker-peelback-active), var(--sticker-start) var(--sticker-peelback-active));
  top:calc(-100% + 2 * var(--sticker-peelback-active) - 1px);
  transition:all var(--sticker-peel-easing);
}
.wsticker-shadow{
  position:absolute; top:0.6rem; left:0.4rem; width:100%; height:100%;
  filter:brightness(0) blur(8px); opacity:0.4;
}
.wsticker-main, .wsticker-flap{ will-change:clip-path, transform; }
`.trim()

export function PeelSticker({
  size, front, back, shadow,
}: {
  size: number
  /** Front of the sticker (shader outline + artwork). */
  front: React.ReactNode
  /** Underside revealed when peeled — the shader fill, or grey paper. */
  back: React.ReactNode
  /** Silhouette used for the cast shadow. */
  shadow: React.ReactNode
}) {
  return (
    <div className="wsticker" style={{ width: size, height: size }}>
      <div className="wsticker-main"><div className="wsticker-upright">{front}</div></div>
      <div className="wsticker-shadow">
        <div className="wsticker-flap"><div className="wsticker-upright">{shadow}</div></div>
      </div>
      <div className="wsticker-flap"><div className="wsticker-upright">{back}</div></div>
    </div>
  )
}

/** Generate a standalone React component reproducing the peel effect. */
export function buildPeelCode(sticker: string, backing: string, size: number): string {
  const layer = (html: string) => `dangerouslySetInnerHTML={{ __html: ${JSON.stringify(html)} }}`
  return `export default function Sticker() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ${JSON.stringify(PEEL_CSS)} }} />
      <div className="wsticker" style={{ width: ${size}, height: ${size} }}>
        <div className="wsticker-main"><div className="wsticker-upright"><div data-svg="" ${layer(sticker)} /></div></div>
        <div className="wsticker-shadow"><div className="wsticker-flap"><div className="wsticker-upright"><div data-svg="" ${layer(sticker)} /></div></div></div>
        <div className="wsticker-flap"><div className="wsticker-upright"><div data-svg="" style={{ filter: 'brightness(0.7)', width: '100%', height: '100%' }} ${layer(backing)} /></div></div>
      </div>
    </>
  )
}
`
}
