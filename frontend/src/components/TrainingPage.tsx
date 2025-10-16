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
  LinearProgress, // Import LinearProgress
} from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';

// Define the structure of the training status
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

  // UI and Status state
  const [isProcessing, setIsProcessing] = useState(false); // General busy state
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({ status: 'idle', progress: 0, message: '' });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' } | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Effect for polling the status endpoint
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

    if (isProcessing) {
      pollingInterval.current = setInterval(pollStatus, 2000); // Poll every 2 seconds
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [isProcessing]);

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

    try {
      const response = await axios.post('http://localhost:8000/train', formData);
      setSnackbar({ open: true, message: response.data.message, severity: 'success' });
      // Polling will start automatically via the useEffect hook
    } catch (error) {
      let message = 'An unknown error occurred.';
      if (axios.isAxiosError(error) && error.response) {
        message = error.response.data.detail || error.response.data.message || message;
      }
      setSnackbar({ open: true, message, severity: 'error' });
      setIsProcessing(false);
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

          {/* Status Display */}
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
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Button variant="contained" color="primary" size="large" onClick={handleStartTraining} disabled={isProcessing}>
              {isProcessing ? <CircularProgress size={24} color="inherit" /> : 'Start Training'}
            </Button>
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
