# Namma Space — 3D Reconstruction

Namma Space is a project to turn indoor captures into 3D digital spaces using COLMAP and Nerfstudio Splatfacto, with a browser-based viewer for exploring reconstructed scenes.

## What is in this repository

- `web_viewer/` is a static Vite + Three.js viewer ready for Vercel.
- The viewer currently displays the Dr. Johnson sparse RGB point cloud (`80,861` points) from `web_viewer/public/models/sparse_pc.ply`.
- The original capture photos, COLMAP working files, training checkpoints, workflow scripts, and project PDFs are not included in this checkout. The `.gitignore` keeps raw datasets and generated training files out of the web deployment.

The current web viewer displays a sparse point cloud; it does not yet render a trained Gaussian Splatfacto model.

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

1. Import `https://github.com/Ashtran-Lit/Namma_Space` into Vercel.
2. Set **Root Directory** to `web_viewer`.
3. Use the Vite framework preset, build command `npm run build`, and output directory `dist`.
4. Deploy. The PLY asset is bundled with the viewer from `web_viewer/public/models/`.

Vercel can automatically create preview deployments for pull requests and production deployments for pushes to the configured production branch.

## Intended reconstruction workflow

The planned project pipeline is:

1. Capture overlapping photographs or video frames of an indoor space.
2. Use COLMAP to estimate camera poses and sparse geometry.
3. Prepare the capture for Nerfstudio.
4. Train a Splatfacto model and export the result.
5. Add a Gaussian-splat-compatible browser renderer to view the trained model.

The capture/training scripts and documentation described in the original project outline still need to be added to this repository.
