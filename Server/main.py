from fastapi import FastAPI, File, UploadFile, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import torch
from typing import List
import shutil
import os
from datetime import datetime

from .train_lora import TrainingConfig, start_training as run_lora_training

app = FastAPI()

# --- In-memory store for training status ---
# In a real-world multi-user app, you'd use a database or Redis.
# For this local single-user app, a simple dict is sufficient.
training_status = {
    "status": "idle", # idle, initializing, loading_models, training, completed, failed
    "progress": 0,    # 0-100
    "message": "Server is ready.",
    "should_stop": False,
}

# --- CORS Middleware ---
origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"message": "Backend server is running."}

@app.get("/check-mps")
def check_mps():
    # ... (omitting unchanged endpoint for brevity)
    if torch.backends.mps.is_available():
        return {"status": "success", "message": "MPS is available and ready for GPU acceleration on your Mac."}
    else:
        return {"status": "error", "message": "MPS is not available. The server will use CPU."}

@app.get("/train/status")
def get_training_status():
    """Endpoint for the frontend to poll for training status."""
    return training_status

@app.post("/train")
async def trigger_training(
    background_tasks: BackgroundTasks,
    images: List[UploadFile] = File(...),
    baseModel: str = Form(...),
    instancePrompt: str = Form(...),
    steps: int = Form(...),
    learningRate: float = Form(...),
    resolution: int = Form(...),
    trainBatchSize: int = Form(...),
):
    if training_status["status"] == "training":
        return {"status": "error", "message": "A training job is already in progress."}

    image_dir = "temp_training_images"
    if os.path.exists(image_dir):
        shutil.rmtree(image_dir)
    os.makedirs(image_dir)

    for image in images:
        filename = os.path.basename(str(image.filename))
        file_path = os.path.join(image_dir, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
    
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    safe_prompt = instancePrompt.replace(' ', '_').replace('\\','').replace('/','')
    output_dir = f"lora_models/{safe_prompt}-{timestamp}"

    training_config = TrainingConfig(
        pretrained_model_name_or_path=baseModel,
        instance_data_dir=image_dir,
        output_dir=output_dir,
        instance_prompt=instancePrompt,
        max_train_steps=steps,
        learning_rate=learningRate,
        resolution=resolution,
        train_batch_size=trainBatchSize,
        # Using some sensible defaults for other params
        gradient_accumulation_steps=1,
        gradient_checkpointing=True, # Good for memory saving
        lr_scheduler="constant",
        report_to="tensorboard", # Will create local logs
         mixed_precision="no", # Required for MPS
    )

    # Reset status and add the training function to background tasks
    training_status.update({"status": "initializing", "progress": 0, "message": "Request received...", "should_stop": False})
    background_tasks.add_task(run_lora_training, config=training_config, status_updater=training_status)

    return {
        "status": "success",
        "message": f"Training started in the background. Model will be saved to '{output_dir}'.",
    }

@app.post("/train/terminate")
def terminate_training():
    """Endpoint to signal the training process to stop."""
    if training_status["status"] in ["training", "initializing", "loading_models"]:
        training_status["should_stop"] = True
        training_status["message"] = "Termination signal received. Finishing current step..."
        return {"status": "success", "message": "Termination signal sent."}
    else:
        return {"status": "error", "message": "No active training to terminate."}