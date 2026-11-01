# Namma Space — 3D Reconstruction

Namma Space turns indoor captures into 3D digital spaces using COLMAP and Nerfstudio Splatfacto, with a browser viewer for exploring both the trained Gaussian reconstruction and the underlying sparse point cloud.

## What is in this repository

- `web_viewer/` is a static Vite viewer for Vercel.
- The Dr. Johnson Splatfacto export is `web_viewer/public/models/drjohnson-splat-rgb.ply` (about 67 MB, 1,025,179 splats).
- The source COLMAP point cloud is `web_viewer/public/models/sparse_pc.ply`.
- The original photos, COLMAP working files, and 705 MB Nerfstudio training checkpoint are not included. The checkpoint is a training artifact, not a browser asset; the optimized RGB Gaussian PLY is what the viewer loads.

## Run the viewer locally

Requires Node.js 18 or later.

```powershell
cd web_viewer
npm ci
npm run dev
```

Create and preview a production build:

```powershell
npm run build
npm run preview
```

## Deploy to Vercel

The existing Vercel project uses `web_viewer` as its Root Directory. Keep that setting, and use the Vite build command `npm run build` with output directory `dist`. The project configuration and cross-origin-isolation headers are in `web_viewer/vercel.json`.

Push changes to the connected production branch to deploy the updated viewer.

## Nerfstudio model

The trained checkpoint is a Nerfstudio 1.1.5 Splatfacto model at step 29,999. It was exported as a browser-compatible Gaussian PLY with RGB colors, reducing the file from about 243 MiB with full spherical harmonics to about 58 MiB. The browser viewer renders the trained splats by default and offers the COLMAP sparse point cloud as an alternate view.

See [`trained_models/drjohnson/README.md`](./trained_models/drjohnson/README.md) for export and file-size guidance. The browser asset normalizes RGB values for the viewer. The checkpoint itself should remain outside Git; `.gitignore` excludes `*.ckpt`.

## Reconstruction workflow

The intended pipeline is:

1. Capture overlapping photographs or video frames.
2. Estimate camera poses and sparse geometry with COLMAP.
3. Prepare the capture for Nerfstudio.
4. Train a Splatfacto model and export a Gaussian PLY.
5. Replace the viewer model asset and update its metadata when publishing a new scene.

Raw captures and generated checkpoints should be stored separately from this static web deployment.
