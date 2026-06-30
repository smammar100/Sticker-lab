# Sticker Studio — Wonder Challenge Submission

A web app that turns any SVG into a glossy die-cut sticker — puffy outline, turbulence, specular light that follows your cursor, and **Wonder shader-filled outlines** — with PNG/SVG/Code export and an LLM "recreate this" prompt.

**The angle that wins judges:** I didn't just *design* in Wonder — I designed it in Wonder, then used **Wonder's MCP server** to drive the build in Claude Code, and shipped **Wonder's `shaders/react`** compositions into the live product. Design → production, all Wonder.

---

## ✅ Submission checklist

- [ ] Short walkthrough video (link below script)
- [x] Built in Wonder using Wonder features (Wonder Chat design, shader generation, **Wonder MCP**)
- [ ] Link to the Wonder file with the final design
- [ ] Posted on X **and/or** LinkedIn, tagging **@usewonder** (X) / **@wonder** (LinkedIn)
- [ ] Used code `CONTRA` for Pro+ credits
- **Deadline:** Jul 7, 11:59am PDT

---

## 🎬 Video walkthrough script (~45s)

> Screen recording with voiceover. Keep Wonder visible whenever you mention it. Tools: Loom or QuickTime + Loom.

**[0:00–0:06] Hook — show the finished app**
> "This is Sticker Studio — drop in any SVG and it becomes a glossy die-cut sticker. But here's the part I'm excited about…"
*(Cursor moves over the sticker — specular highlight follows. Click through 2–3 presets so the shader outlines change live.)*

**[0:06–0:16] The Wonder design**
> "I designed the whole thing in Wonder first — the editor, the controls panel, the export dialog."
*(Cut to your Wonder file. Pan across the screens. Show the Wonder Chat prompt that generated a screen.)*

**[0:16–0:28] Wonder shaders — the differentiator**
> "The outlines aren't just a color — they're Wonder shaders. I generated these in Wonder, exported them as React, and masked them to the sticker's silhouette so the shader fills the puffy border."
*(Show the Wonder shader generation UI, then cut back to the app switching Aurora → Plasma → Holo on a sticker. The animated glow sells it.)*

**[0:28–0:38] Wonder MCP → live build**
> "Then I connected Wonder's MCP server to Claude Code. That bridge let me go straight from the Wonder design to a working Next.js app — same components, real interactions."
*(Show the `claude mcp add … wonder` line and the design-to-code moment.)*

**[0:38–0:45] Payoff — export**
> "And you can export it as a PNG with the shader baked in, an SVG, or React code — plus an AI prompt to recreate it in any LLM. Designed in Wonder, shipped with Wonder."
*(Open the Export dialog, hit Export, show the downloaded sticker.)*

**Recording tips**
- Record at 1440×900 so the 3-panel layout breathes.
- Load the **Heart (Holo)** or **Star (Rays)** preset for the hero shot — animated shaders pop on video.
- Keep it under 60s. Energy > completeness.

---

## 𝕏 (Twitter) post

> Built **Sticker Studio** for the @usewonder challenge 🎨
>
> Drop in any SVG → glossy die-cut sticker. The outlines are real **Wonder shaders**, masked to the silhouette. Specular light follows your cursor. Export to PNG/SVG/React.
>
> Designed in Wonder, then shipped via the Wonder MCP. 👇
>
> [30s video] #madeinwonder

## 💼 LinkedIn post

> I built **Sticker Studio** for the @wonder design challenge — and the workflow is the story.
>
> It turns any SVG into a glossy die-cut sticker: a puffy outline, turbulence, a specular highlight that tracks your cursor, and outlines filled with **Wonder shaders** (Aurora, Plasma, Holo, Rays…). Export to PNG (shader baked in), SVG, or React code — plus an AI prompt to recreate the sticker in any LLM.
>
> What made it click: I designed it in Wonder, generated the shaders in Wonder, then connected **Wonder's MCP server** to my coding agent to go from design straight to a working Next.js app. Design → production, without redrawing anything.
>
> Wonder file + 30s walkthrough in the comments. Built with @wonder.
>
> #design #generativeUI #madeinwonder

---

## 🗣️ Talking points (if asked / for the post thread)

- **Hardest/coolest technical bit:** SVG `feMorphology` builds the puffy silhouette; that silhouette becomes a CSS mask, and the Wonder shader renders *only inside the outline ring*. For PNG export I render the shader to a hidden 1024px canvas and composite it under the shape so the glow is baked into the file.
- **Why Wonder mattered:** the shader compositions would've taken days to hand-write in GLSL. Generating them in Wonder and exporting `shaders/react` was minutes.
- **Originality:** most "sticker makers" stop at a flat outline. Shader-filled die-cut borders + an LLM recreation prompt is the unexpected part.
