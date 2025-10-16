import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Slider,
  Box,
  Grid,
  Input,
  CircularProgress,
  Snackbar,
  Alert,
  LinearProgress,
  Tooltip, // Import Tooltip
  IconButton,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'; // Import help icon
import PhotoCamera from '@mui/icons-material/PhotoCamera';

interface TrainingStatus {
  status: 'idle' | 'initializing' | 'loading_models' | 'training' | 'completed' | 'failed';
  progress: number;
  message: string;
}

const TrainingPage: React.FC = () => {
  // Form state
  const [files, setFiles] = useState<FileList | null>(null);
  const [baseModel, setBaseModel] = useState('runwayml/stable-diffusion-v1-5');
  const [instancePrompt, setInstancePrompt] = useState('');
  const [steps, setSteps] = useState<number>(500);
  const [learningRate, setLearningRate] = useState<number>(1e-4);
  const [resolution, setResolution] = useState<number>(512); // New state
  const [trainBatchSize, setTrainBatchSize] = useState<number>(1); // New state

  // UI and Status state
  const [isProcessing, setIsProcessing] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({ status: 'idle', progress: 0, message: '' });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' } | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Polling effect
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await axios.get('http://localhost:8000/train/status');
        const newStatus: TrainingStatus = response.data;
        setTrainingStatus(newStatus);

        if (newStatus.status === 'completed' || newStatus.status === 'failed') {
          if (pollingInterval.current) clearInterval(pollingInterval.current);
          setIsProcessing(false);
          const severity = newStatus.status === 'completed' ? 'success' : 'error';
          setSnackbar({ open: true, message: newStatus.message, severity: severity });
        }
      } catch (error) {
        console.error("Failed to poll status:", error);
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        setIsProcessing(false);
      }
    };

    if (isProcessing && (trainingStatus.status === 'initializing' || trainingStatus.status === 'loading_models' || trainingStatus.status === 'training')) {
        pollingInterval.current = setInterval(pollStatus, 2000);
    } else {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
    }

    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, [isProcessing, trainingStatus.status]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(event.target.files);
  };

  const handleStartTraining = async () => {
    if (!files || files.length === 0) {
      setSnackbar({ open: true, message: 'Please select images first.', severity: 'error' });
      return;
    }

    setIsProcessing(true);
    setTrainingStatus({ status: 'initializing', progress: 0, message: 'Sending request...' });

    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('images', file));
    formData.append('baseModel', baseModel);
    formData.append('instancePrompt', instancePrompt);
    formData.append('steps', steps.toString());
    formData.append('learningRate', learningRate.toString());
    formData.append('resolution', resolution.toString()); // Append new param
    formData.append('trainBatchSize', trainBatchSize.toString()); // Append new param

    try {
      const response = await axios.post('http://localhost:8000/train', formData);
      setSnackbar({ open: true, message: response.data.message, severity: 'success' });
    } catch (error) {
      let message = 'An unknown error occurred.';
      if (axios.isAxiosError(error) && error.response) {
        message = error.response.data.detail || error.response.data.message || message;
      }
      setSnackbar({ open: true, message, severity: 'error' });
      setIsProcessing(false);
    }
  };

  const handleCancelTraining = async () => {
    try {
      const response = await axios.post('http://localhost:8000/train/terminate');
      setSnackbar({ open: true, message: response.data.message, severity: 'success' });
    } catch (error) {
      let message = 'Failed to send termination signal.';
      if (axios.isAxiosError(error) && error.response) {
        message = error.response.data.detail || error.response.data.message || message;
      }
      setSnackbar({ open: true, message, severity: 'error' });
    }
  };

  const isTrainingActive = trainingStatus.status !== 'idle' && trainingStatus.status !== 'completed' && trainingStatus.status !== 'failed';

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h4" component="h1" gutterBottom>
            LoRA Model Training
          </Typography>

          {isTrainingActive && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>{trainingStatus.message}</Typography>
              <LinearProgress variant="determinate" value={trainingStatus.progress} />
            </Box>
          )}

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
               <Typography variant="h6" gutterBottom>1. Upload Images</Typography>
               <Box border={1} p={2} borderRadius={1} borderColor="grey.400" sx={{ textAlign: 'center' }}>
                 <label htmlFor="upload-button-file">
                   <Input id="upload-button-file" type="file" inputProps={{ multiple: true, accept: 'image/*' }} onChange={handleFileChange} sx={{ display: 'none' }} />
                   <Button variant="outlined" component="span" startIcon={<PhotoCamera />} disabled={isProcessing}>
                     Select Images
                   </Button>
                 </label>
                 {files && <Typography variant="body2" sx={{ mt: 1 }}>{files.length} image(s) selected.</Typography>}
               </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>2. Set Parameters</Typography>
              <TextField fullWidth label="Base Model ID" variant="outlined" sx={{ mb: 2 }} value={baseModel} onChange={(e) => setBaseModel(e.target.value)} disabled={isProcessing} />
              <TextField fullWidth label="Instance Prompt (e.g., 'a photo of sks dog')" variant="outlined" sx={{ mb: 2 }} value={instancePrompt} onChange={(e) => setInstancePrompt(e.target.value)} disabled={isProcessing} />
              
              <Typography gutterBottom>Training Steps ({steps})</Typography>
              <Slider value={steps} onChange={(_, newValue) => setSteps(newValue as number)} aria-label="Training Steps" valueLabelDisplay="auto" step={100} marks min={100} max={2000} disabled={isProcessing} />
              
              <Typography gutterBottom>Learning Rate ({learningRate.toExponential(1)})</Typography>
              <Slider value={learningRate} onChange={(_, newValue) => setLearningRate(newValue as number)} aria-label="Learning Rate" valueLabelDisplay="auto" step={1e-5} min={1e-5} max={1e-3} scale={(x) => x} disabled={isProcessing} />

              {/* New Resolution Slider */}
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography gutterBottom>Resolution ({resolution}px)</Typography>
                <Tooltip title="设置训练时图片处理的尺寸。更大的分辨率可以保留更多细节，但会显著增加训练时间和显存消耗。建议与您使用的基础模型的常用尺寸保持一致（例如v1.5为512px）。">
                  <IconButton size="small"><HelpOutlineIcon fontSize="small" /></IconButton>
                </Tooltip>
              </Box>
              <Slider value={resolution} onChange={(_, newValue) => setResolution(newValue as number)} aria-label="Resolution" valueLabelDisplay="auto" step={128} marks min={512} max={1024} disabled={isProcessing} />

              {/* New Batch Size Slider */}
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography gutterBottom>Batch Size ({trainBatchSize})</Typography>
                <Tooltip title="每次让模型同时“看”几张图片。在显存有限的Mac上，建议保持为1。增加此值会加快训练，但会急剧增加显存消耗，可能导致训练失败。">
                  <IconButton size="small"><HelpOutlineIcon fontSize="small" /></IconButton>
                </Tooltip>
              </Box>
              <Slider value={trainBatchSize} onChange={(_, newValue) => setTrainBatchSize(newValue as number)} aria-label="Batch Size" valueLabelDisplay="auto" step={4} marks min={1} max={8} disabled={isProcessing} />

            </Grid>
          </Grid>

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            {!isTrainingActive ? (
              <Button variant="contained" color="primary" size="large" onClick={handleStartTraining} disabled={isProcessing}>
                {isProcessing ? <CircularProgress size={24} color="inherit" /> : 'Start Training'}
              </Button>
            ) : (
              <Button variant="contained" color="error" size="large" onClick={handleCancelTraining} disabled={!isTrainingActive}>
                Cancel Training
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {snackbar && (
        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setSnackbar(null)} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      )}
    </Container>
  );
};

export default TrainingPage;