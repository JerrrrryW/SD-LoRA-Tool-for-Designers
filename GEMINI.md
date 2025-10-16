# GEMINI Project Context: LoRA Training Platform

## Project Overview

This project is a web-based platform for locally training LoRA (Low-Rank Adaptation) models for Stable Diffusion on Apple Silicon (M-series) Macs. It provides a simple, designer-friendly user interface to upload images, configure training parameters, and run the training process without needing to use the command line directly.

### Architecture

The application uses a client-server architecture:

-   **Frontend**: A single-page application built with **React (using Vite)** and **TypeScript**. It uses **Material-UI (MUI)** for its component library. The frontend allows users to upload training images, set parameters like the base model and learning rate, and monitor the training status.

-   **Backend**: A Python server built with **FastAPI**. It exposes a REST API to the frontend. The core training logic is handled by a modified version of the Hugging Face `diffusers` library's standard LoRA training script. Training is run as a **background task** to prevent HTTP timeouts, and the status is exposed via a separate polling endpoint.

### Core Technologies

-   **Frontend**: React, Vite, TypeScript, Material-UI, Axios
-   **Backend**: Python, FastAPI, PyTorch (with MPS for GPU acceleration), `diffusers`, `peft`, `accelerate`

---

## Building and Running

This project requires two separate processes to be run: the backend server and the frontend development server.

### 1. Backend Setup

The backend relies on a specific Conda environment and a set of Python packages.

-   **Environment**: A Conda environment named `aigc` is required.

-   **Key Dependencies**:
    -   `fastapi`, `uvicorn`
    -   `torch`, `torchvision`
    -   `diffusers` (installed from source)
    -   `peft`, `accelerate`, `transformers`

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
    -   Long-running tasks like AI model training are executed in background threads using `BackgroundTasks` to keep the API responsive.
    -   A simple in-memory dictionary (`training_status`) is used for state management of the training job. This is suitable for a local, single-user application.
    -   The core training logic resides in `Server/train_lora.py`, which is a refactored version of a standard Hugging Face training script.

-   **Frontend UI**:
    -   The main application component is `frontend/src/App.tsx`.
    -   The primary UI is located in `frontend/src/components/TrainingPage.tsx`.
    -   The application communicates with the backend via REST API calls using `axios`.
    -   It uses `setInterval` to poll the `/train/status` endpoint for real-time progress updates during training.

-   **Model & Data Storage**:
    -   Images uploaded for training are temporarily stored in the `temp_training_images` directory.
    -   Completed LoRA models are saved to the `lora_models` directory, with each training run getting its own timestamped sub-folder.
