# Namma Space viewer

A static Vite site for exploring the Dr. Johnson sparse RGB point cloud in a browser. The viewer uses Three.js to render `public/models/sparse_pc.ply`. The source photos and other training data are not included in the web build.

## Run locally

From this directory:

```bash
npm install
npm run dev
```

Create and preview a production build:

```bash
npm run build
npm run preview
```

## Deploy to Vercel

1. Import the Git repository into Vercel.
2. Set **Root Directory** to `web_viewer`.
3. Use the detected Vite settings, or set the build command to `npm run build` and output directory to `dist`.
4. Deploy. The viewer includes its required point-cloud asset under `public/models/`.

This directory is only the web viewer; capture and model-training scripts belong in the repository's separate project workflow.
