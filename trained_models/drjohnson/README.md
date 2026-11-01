# Dr. Johnson Splatfacto model

The browser-ready export is stored in [`web_viewer/public/models/drjohnson-splat-rgb.ply`](../../web_viewer/public/models/drjohnson-splat-rgb.ply).

## Export details

- Method: Nerfstudio Splatfacto
- Training step: 29,999 of 30,000
- Source checkpoint: `step-000029999.ckpt` (about 705 MiB; intentionally not committed)
- Browser asset: RGB Gaussian PLY, 1,025,179 splats, about 67 MiB

The compact RGB export omits the model's view-dependent spherical-harmonics coefficients. The full-coefficient PLY is about 243 MiB, larger than is appropriate for this static Vercel asset. The browser-ready asset stores normalized floating-point colors because the viewer expects RGB values from 0 to 1. Keep the source checkpoint and full export in model storage or local training outputs, not Git.

To produce an updated browser asset from the trained checkpoint, run this from the Git repository root in an environment with the matching Nerfstudio installation:

```powershell
ns-export gaussian-splat `
  --load-config <path-to-trained-config.yml> `
  --output-dir <temporary-export-directory> `
  --output-filename drjohnson-splat-rgb.ply `
  --ply-color-mode rgb
```

Convert the Nerfstudio output into the browser-ready format from the repository root:

```powershell
python trained_models/drjohnson/prepare_rgb_ply.py `
  <temporary-export-directory>\drjohnson-splat-rgb.ply `
  web_viewer/public/models/drjohnson-splat-rgb.ply
```

The supplied training config references the original local dataset path. If that dataset has moved, update the config/data path before exporting. After export, update the trained-splat count and training-step label in `web_viewer/src/main.js` if the new model differs.
