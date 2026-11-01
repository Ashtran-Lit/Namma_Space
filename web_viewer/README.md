# Namma Space web viewer

This Vite app displays the Dr. Johnson Nerfstudio Splatfacto reconstruction by default. Use the tabs to switch between the trained Gaussian splats and the COLMAP sparse point cloud.

## Viewer controls

- Drag to orbit and scroll to zoom.
- Hover over the trained view and hold `W`, `A`, `S`, or `D` to move through the scene.
- Use **Reset view** to return to the center of the room.
- The top-down room map shows the trained scene layout, room borders, and current camera position and direction.
- Use **Fullscreen** to expand the viewer; press **Exit fullscreen** or `Esc` to return.
- The trained view does not show model download or auto-rotate controls. The sparse-cloud tab retains its download link.

## Run locally

Requires Node.js 18 or later.

```powershell
npm ci
npm run dev
```

The Vite development and preview servers use the same cross-origin isolation headers as Vercel. The viewer uses non-shared worker memory and CPU sorting for reliable Gaussian rendering. Use `npm run build` and `npm run preview` to test a production build.

## Model files

- `public/models/drjohnson-splat-rgb.ply` is the browser-ready trained model.
- `public/models/sparse_pc.ply` is the COLMAP alternative.
- Training checkpoints and raw captures are intentionally kept out of this static deployment.

The trained asset uses normalized floating-point RGB fields for compatibility with the browser renderer. To prepare a fresh RGB export, run Nerfstudio's `ns-export gaussian-splat --ply-color-mode rgb`, then convert the resulting PLY with the script documented in [`trained_models/drjohnson/README.md`](../trained_models/drjohnson/README.md).

## Vercel

The existing Vercel project should use this directory as its Root Directory, with `npm run build` and `dist` as the output directory. `vercel.json` configures the cross-origin isolation response headers used by the renderer.
