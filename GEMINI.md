# GEMINI Project Context: LoRA Training and Inference Platform

## Project Overview

This project is a web-based platform for locally training LoRA (Low-Rank Adaptation) models and running Stable Diffusion inference on Apple Silicon (M-series) Macs. It provides a simple, designer-friendly user interface for two main tasks:

1.  **LoRA Training**: Upload images, configure training parameters, and run the training process without needing to use the command line directly.
2.  **Stable Diffusion Inference**: A simple interface to generate images from text prompts using a base Stable Diffusion model.

### Architecture

The application uses a client-server architecture:

-   **Frontend**: A single-page application built with **React (using Vite)** and **TypeScript**. It uses **Material-UI (MUI)** for its component library and **React Router** for navigation. The frontend now consists of two main pages: a training page and an inference page, wrapped in a consistent layout with a sidebar.

-   **Backend**: A Python server built with **FastAPI**. It exposes a REST API to the frontend. 
    -   The core training logic is handled by a modified version of the Hugging Face `diffusers` library's standard LoRA training script. Training is run as a **background task** to prevent HTTP timeouts.
    -   The inference logic uses the `diffusers` library to generate images from prompts. The Stable Diffusion model is loaded **on-demand** for each inference request to conserve memory for the training process, and released immediately after.

### Core Technologies

-   **Frontend**: React, Vite, TypeScript, Material-UI, Axios, React Router
-   **Backend**: Python, FastAPI, PyTorch (with MPS for GPU acceleration), `diffusers`, `peft`, `accelerate`, `transformers`

---

## Building and Running

This project requires two separate processes to be run: the backend server and the frontend development server.

### 1. Backend Setup

The backend relies on a specific Conda environment and a set of Python packages.

-   **Environment**: A Conda environment named `aigc` is required.

-   **Dependencies**: All Python dependencies are listed in `requirements.txt`. You can install them with:
    ```bash
    pip install -r requirements.txt
    ```

-   **Running the Server**:
    From the project root directory (`AIGC-Training`), run the following command:

    ```bash
    conda run -n aigc uvicorn Server.main:app --reload --port 8000
    ```

### 2. Frontend Setup

The frontend is a standard Vite-based React application.

-   **Dependency Installation**:
    Navigate to the `frontend` directory and run:

    ```bash
    cd frontend
    npm install
    ```

-   **Running the Development Server**:
    While inside the `frontend` directory, run:

    ```bash
    npm run dev
    ```
    The application will typically be available at `http://localhost:5173`.

---

## Development Conventions

-   **Backend API**:
    -   The main FastAPI application is in `Server/main.py`.
    -   Long-running tasks like AI model training are executed in background threads using `BackgroundTasks`.
    -   A new `/generate` endpoint has been added for Stable Diffusion inference. It loads the model on-demand and releases it after use to conserve memory.
    -   The core training logic resides in `Server/train_lora.py`.

-   **Frontend UI**:
    -   The main application component is `frontend/src/App.tsx`, which now includes routing.
    -   A new `Layout.tsx` component provides a consistent sidebar and app bar for all pages.
    -   The training UI is in `frontend/src/components/TrainingPage.tsx`.
    -   A new inference UI has been added in `frontend/src/components/InferencePage.tsx`.
    -   The application communicates with the backend via REST API calls using `axios`.

-   **Model & Data Storage**:
    -   Images uploaded for training are temporarily stored in the `temp_training_images` directory.
    -   Completed LoRA models are saved to the `lora_models` directory, with each training run getting its own timestamped sub-folder.
