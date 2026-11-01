# Namma Space -- 3D Reconstruction

**Transforming indoor spaces into photorealistic 3D digital environments
using Gaussian Splatting.**

## Overview

Namma Space is an indoor 3D reconstruction project that converts images
and videos of real-world indoor environments into detailed,
photorealistic 3D scenes.

The project uses **COLMAP** for camera pose estimation and
Structure-from-Motion (SfM), followed by **Nerfstudio Splatfacto** to
generate 3D Gaussian Splat representations.

The reconstructed environment can be explored through an interactive 3D
viewer, providing an immersive virtual walkthrough of the captured
space.

## Objectives

-   Capture indoor environments using images or video.
-   Establish a repeatable image-capture Standard Operating Procedure
    (SOP).
-   Estimate camera positions and reconstruct scene geometry using
    COLMAP.
-   Generate photorealistic 3D scenes using Gaussian Splatting.
-   Enable interactive exploration through a 3D viewer.
-   Develop a foundation for future indoor mapping and navigation
    applications.

## Technology Stack

  Technology            Purpose
  --------------------- ---------------------------------
  Python                Processing and automation
  COLMAP                Camera pose estimation and SfM
  Nerfstudio            3D reconstruction pipeline
  Splatfacto            Gaussian Splatting model
  CUDA                  GPU acceleration
  PowerShell            Workflow automation
  Web-based 3D Viewer   Interactive scene visualization

## Repository Structure

``` text
Namma-Space-3D-Reconstruction/
│
├── README.md
├── requirements.txt
├── .gitignore
│
├── docs/
│   ├── Technical_Abstract.pdf
│   └── Capture_SOP.pdf
│
├── scripts/
│   ├── extract_frames.py
│   ├── process_images.ps1
│   ├── train_splatfacto.ps1
│   └── export_model.ps1
│
├── test_data/
│   └── drjohnson/
│       ├── images/
│       └── sparse/
│           └── 0/
│               ├── cameras.bin
│               ├── images.bin
│               └── points3D.bin
│
├── trained_models/
│   └── drjohnson/
│       ├── config.yml
│       └── checkpoints/
│
└── web_viewer/
    ├── source_code/
    └── README.md
```

## Reconstruction Pipeline

The project follows these major stages:

### 1. Image and Video Capture

Capture an indoor environment by recording a video or taking overlapping
photographs from multiple viewpoints.

Follow the capture guidelines provided in `docs/Capture_SOP.pdf`.

### 2. Frame Extraction

Extract individual frames from the recorded video using:

``` powershell
python scripts/extract_frames.py
```

### 3. Camera Pose Estimation -- COLMAP

Process the captured images using COLMAP to estimate camera positions,
orientations, and sparse 3D points.

### 4. Dataset Processing

Prepare the reconstructed image dataset for Nerfstudio using the
image-processing workflow.

### 5. Gaussian Splatting

Train the Splatfacto model using Nerfstudio to generate a photorealistic
3D representation.

### 6. Model Export and Visualization

Prepare the trained model for visualization and load it into the
interactive 3D viewer.

## Installation and Setup

### Prerequisites

-   Windows 10/11 (64-bit)
-   Python environment compatible with Nerfstudio
-   NVIDIA GPU with CUDA support
-   COLMAP
-   Nerfstudio
-   Microsoft Visual C++ Build Tools (if required by compiled
    dependencies)

### 1. Clone the Repository

``` powershell
git clone https://github.com/YOUR-USERNAME/Namma-Space-3D-Reconstruction.git
cd Namma-Space-3D-Reconstruction
```

Replace `YOUR-USERNAME` with your GitHub username.

### 2. Set Up the Python Environment

Activate your Nerfstudio-compatible environment:

``` powershell
conda activate nerfstudio
```

Install the project dependencies:

``` powershell
pip install -r requirements.txt
```

Ensure that COLMAP and Nerfstudio are accessible from your terminal.

## Running the Project

The reconstruction workflow is organized into scripts inside the
`scripts/` directory.

  Script                   Function
  ------------------------ -------------------------------------------
  `extract_frames.py`      Extracts frames from input videos
  `process_images.ps1`     Processes images and prepares the dataset
  `train_splatfacto.ps1`   Starts Gaussian Splatting training
  `export_model.ps1`       Handles model export

Run each script using the appropriate input and output paths configured
for your dataset.

## Launching the 3D Viewer

The trained reconstruction can be opened using the Nerfstudio viewer.

Activate the environment and run:

``` powershell
ns-viewer --load-config "trained_models/drjohnson/config.yml"
```

Open the local URL displayed in the terminal.

**Note:** The viewer command and model-loading configuration may depend
on the installed Nerfstudio version. The local Nerfstudio viewer is not
automatically a publicly hosted web application. A publicly accessible
viewer link must be deployed separately if required.

## Sample Dataset

This repository includes the **DrJohnson** scene from the Deep Blending
dataset for testing and demonstrating the reconstruction pipeline.

The sample dataset helps validate the COLMAP and Nerfstudio workflow
before processing independently captured indoor environments.

The sample dataset is intended for testing and does not replace the
project's own indoor environment capture.

## Project Documentation

Additional technical information is available in the `docs/` directory:

-   **Technical_Abstract.pdf:** Project architecture, methodology, and
    technical overview.
-   **Capture_SOP.pdf:** Guidelines for capturing indoor environments
    consistently.

## Future Scope

-   Publicly accessible browser-based 3D viewer.
-   First-person navigation using keyboard and mouse controls.
-   Improved reconstruction quality and rendering performance.
-   Indoor spatial mapping and navigation.
-   Support for larger and more complex indoor environments.

## Contributors

**Namma Space -- 3D Reconstruction Team**

Developed as part of the Techfest 2026--27 project initiative.

------------------------------------------------------------------------

*Building immersive digital representations of real-world indoor
spaces.*
