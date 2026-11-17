# The Second Lock

50 seconds, portrait. Original procedural Canvas2D illustration, locally synthesized Elena dialogue, and a generated score and Foley.

| Time | Sequence |
| --- | --- |
| 0–8 | Trembling key close-up, deadbolt click, and Elena catching her breath at the door. |
| 8–18 | Shoulder-level track into the bedroom, then the tightly made bed and footprint. |
| 18–28 | Whip pan back to the foyer, lamp in hand, and a closer view of the unlocked bolt and untouched keys. |
| 28–38 | Phone-lit Elena, Mom's first text, and an insert on the scraped, muddy hands. |
| 38–50 | Mom's second text over the closet push, Elena's double behind the slats, then black and a final deadbolt click. |

The manifest selects and times the twelve views. The reusable apartment set lives under the studio library and shares palette, door geometry, and character primitives across the views.

The film holds on the text and evidence inserts and ends on a full second of black. The default studio motion threshold flagged the cut at 0.5708 against 1.5. This project uses a lower clip floor and permits still individual shots. Evaluate the intended holds when reviewing the cut.

To reproduce the export from the repository root, run `make-voice`, `align`, `render --quality standard`, `mix`, and `verify --quality standard` through `node studio/cli/studio.mjs`. Pass `--project projects/the-second-lock` to each command. On the Windows render host, setting `$env:STUDIO_SOFTWARE_CANVAS='1'` for rendering substantially reduced capture time.
