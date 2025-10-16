from fastapi import FastAPI, File, UploadFile, Form, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import torch
from typing import List, Optional
import shutil
import os
from datetime import datetime
import io
from diffusers import DiffusionPipeline

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


# --- Pydantic Models ---
class GenerateRequest(BaseModel):
    prompt: str
    negative_prompt: Optional[str] = None






# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"message": "Backend server is running."}

import json

async def generate_image_stream(req: GenerateRequest):
    """Generates an image and streams progress updates."""
    # Callback function to update progress
    def progress_callback(step: int, timestep: float, latents: torch.FloatTensor):
        progress = step / 50 * 100
        # Yield progress update as a JSON string
        yield f"data: {json.dumps({'status': 'processing', 'step': step, 'total_steps': 50, 'progress': progress})}\n\n"

    try:
        pipe = DiffusionPipeline.from_pretrained(
            "runwayml/stable-diffusion-v1-5",
            torch_dtype=torch.float16,
            use_safetensors=True,
        )
        if torch.backends.mps.is_available():
            pipe = pipe.to("mps")

        # Generate the image with the callback
        image = pipe(
            prompt=req.prompt,
            negative_prompt=req.negative_prompt,
            num_inference_steps=50,
            guidance_scale=7.5,
            callback_on_step_end=progress_callback,
        ).images[0]

        # Save the image to a byte stream
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        # Yield the final image
        yield f"data: {json.dumps({'status': 'completed', 'image': img_byte_arr.read().hex()})}\n\n"

    except Exception as e:
        print(f"Error during image generation: {e}")
        yield f"data: {json.dumps({'status': 'error', 'message': 'Failed to generate image.'})}\n\n"
    finally:
        if 'pipe' in locals():
            del pipe
            torch.cuda.empty_cache()

import uuid

inference_status = {
    "status": "idle", # idle, loading, processing, completed, failed
    "progress": 0,
    "step": 0,
    "total_steps": 50,
    "message": "Ready for inference.",
    "image_id": None,
}

# In-memory store for generated images
# In a real app, you might use a temporary file store or a cache like Redis
generated_images = {}

def run_inference_task(req: GenerateRequest):
    """The actual long-running task for generating an image."""
    inference_status.update({
        "status": "loading",
        "progress": 0,
        "step": 0,
        "message": "Loading Stable Diffusion model...",
        "image_id": None,
    })

    def progress_callback(pipe, step, timestep, callback_kwargs):
        inference_status.update({
            "status": "processing",
            "step": step,
            "progress": (step / inference_status["total_steps"]) * 100,
            "message": f"Inference in progress... Step {step}/{inference_status['total_steps']}",
        })
        return callback_kwargs

    pipe = None
    try:
        pipe = DiffusionPipeline.from_pretrained(
            "runwayml/stable-diffusion-v1-5",
            torch_dtype=torch.float16,
            use_safetensors=True,
        )
        if torch.backends.mps.is_available():
            pipe = pipe.to("mps")

        inference_status["status"] = "processing"
        image = pipe(
            prompt=req.prompt,
            negative_prompt=req.negative_prompt,
            num_inference_steps=inference_status["total_steps"],
            guidance_scale=7.5,
            callback_on_step_end=progress_callback,
        ).images[0]

        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='PNG')
        
        image_id = str(uuid.uuid4())
        generated_images[image_id] = img_byte_arr.getvalue()

        inference_status.update({
            "status": "completed",
            "progress": 100,
            "message": "Image generation complete.",
            "image_id": image_id,
        })

    except Exception as e:
        print(f"Error during image generation: {e}")
        inference_status.update({"status": "failed", "message": str(e)})
    finally:
        if pipe is not None:
            del pipe
            torch.cuda.empty_cache()

@app.post("/generate")
async def start_generation(req: GenerateRequest, background_tasks: BackgroundTasks):
    if inference_status["status"] in ["loading", "processing"]:
        return {"status": "error", "message": "An inference job is already in progress."}
    
    background_tasks.add_task(run_inference_task, req)
    return {"status": "success", "message": "Image generation started in the background."}

@app.get("/generate/status")
def get_inference_status():
    return inference_status

@app.get("/models")
def get_lora_models():
    models_dir = "lora_models"
    if not os.path.exists(models_dir):
        return []

    model_folders = [d for d in os.listdir(models_dir) if os.path.isdir(os.path.join(models_dir, d))]
    
    models_info = []
    for folder in model_folders:
        folder_path = os.path.join(models_dir, folder)
        # Check if the directory is empty and delete it if so
        if not os.listdir(folder_path):
            print(f"Found and deleting empty model directory: {folder_path}")
            try:
                shutil.rmtree(folder_path)
            except OSError as e:
                print(f"Error deleting empty directory {folder_path}: {e}")
            continue

        try:
            # Example folder name: lora-models/sks_dog-20251017-103000
            parts = folder.split('-')
            prompt = parts[0].replace('_', ' ')
            date = parts[1]
            time = parts[2]
            creation_time = datetime.strptime(f"{date}-{time}", "%Y%m%d-%H%M%S").isoformat()

            models_info.append({
                "name": folder,
                "prompt": prompt,
                "creation_time": creation_time,
            })
        except (IndexError, ValueError) as e:
            # Skip folders with unexpected naming conventions
            print(f"Could not parse model folder '{folder}': {e}")
            continue
            
    # Sort models by creation time, newest first
    models_info.sort(key=lambda x: x["creation_time"], reverse=True)
    
    return models_info

@app.get("/models/download/{model_name}")
def download_lora_model(model_name: str):
    models_dir = "lora_models"
    model_path = os.path.join(models_dir, model_name)

    if not os.path.isdir(model_path):
        return JSONResponse(status_code=404, content={"message": "Model not found."})

    # Check if the directory is empty
    if not os.listdir(model_path):
        print(f"Attempted to download an empty model directory. Deleting it: {model_path}")
        try:
            shutil.rmtree(model_path)
        except OSError as e:
            print(f"Error deleting empty directory {model_path}: {e}")
        return JSONResponse(status_code=404, content={"message": "Model is empty and has been deleted. Please refresh the model list."})

    # Create a zip archive of the model directory
    shutil.make_archive(model_name, 'zip', model_path)

    return FileResponse(f"{model_name}.zip", media_type='application/zip', filename=f"{model_name}.zip")

@app.delete("/models/delete/{model_name}")
def delete_lora_model(model_name: str):
    models_dir = "lora_models"
    model_path = os.path.join(models_dir, model_name)

    if not os.path.isdir(model_path):
        return {"status": "error", "message": "Model not found."}

    try:
        shutil.rmtree(model_path)
        return {"status": "success", "message": f"Model '{model_name}' deleted successfully."}
    except Exception as e:
        return {"status": "error", "message": f"Failed to delete model: {e}"}


@app.get("/generate/image/{image_id}")
def get_generated_image(image_id: str):
    image_data = generated_images.get(image_id)
    if not image_data:
        return {"status": "error", "message": "Image not found."}
    
    # Clean up the image from memory after it's been fetched once
    # del generated_images[image_id]
    
    return StreamingResponse(io.BytesIO(image_data), media_type="image/png")

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