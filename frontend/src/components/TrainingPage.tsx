import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { 
  Container, Typography, Card, CardContent, Button, TextField, Slider, Box, Grid, 
  CircularProgress, Snackbar, Alert, LinearProgress, Tooltip, IconButton, Select, MenuItem, FormControl, InputLabel 
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';

interface TrainingStatus {
  status: 'idle' | 'initializing' | 'loading_models' | 'training' | 'completed' | 'failed';
  progress: number;
  message: string;
}

const TrainingPage: React.FC = () => {
  const { t } = useTranslation();
  // Form state
  const [files, setFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [baseModel, setBaseModel] = useState('runwayml/stable-diffusion-v1-5');
  const [modelName, setModelName] = useState('');
  const [instancePrompt, setInstancePrompt] = useState('');
  const [steps, setSteps] = useState<number>(500);
  const [learningRate, setLearningRate] = useState<number>(1e-4);
  const [resolution, setResolution] = useState<number>(512);
  const [trainBatchSize, setTrainBatchSize] = useState<number>(1);

  // UI and Status state
  const [isProcessing, setIsProcessing] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({ status: 'idle', progress: 0, message: '' });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' } | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const handleFileChange = (newFiles: File[]) => {
    setFiles(prevFiles => [...prevFiles, ...newFiles]);
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(prevPreviews => [...prevPreviews, ...newPreviews]);
  };

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    handleFileChange(droppedFiles);
  }, []);

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleRemoveImage = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

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
        console.error(t('trainingPage.pollStatusFailed'), error);
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
  }, [isProcessing, trainingStatus.status, t]);

  const handleStartTraining = async () => {
    if (files.length === 0) {
      setSnackbar({ open: true, message: t('trainingPage.selectImagesFirst'), severity: 'error' });
      return;
    }

    setIsProcessing(true);
    setTrainingStatus({ status: 'initializing', progress: 0, message: t('trainingPage.sendingRequest') });

    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    formData.append('modelName', modelName);
    formData.append('baseModel', baseModel);
    formData.append('instancePrompt', instancePrompt);
    formData.append('steps', steps.toString());
    formData.append('learningRate', learningRate.toString());
    formData.append('resolution', resolution.toString());
    formData.append('trainBatchSize', trainBatchSize.toString());

    try {
      const response = await axios.post('http://localhost:8000/train', formData);
      setSnackbar({ open: true, message: response.data.message, severity: 'success' });
    } catch (error) {
      let message = t('trainingPage.unknownError');
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
      let message = t('trainingPage.terminationSignalFailed');
      if (axios.isAxiosError(error) && error.response) {
        message = error.response.data.detail || error.response.data.message || message;
      }
      setSnackbar({ open: true, message, severity: 'error' });
    }
  };

  const isTrainingActive = trainingStatus.status !== 'idle' && trainingStatus.status !== 'completed' && trainingStatus.status !== 'failed';

  return (
    <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('trainingPage.title')}
      </Typography>

      {isTrainingActive && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>{trainingStatus.message}</Typography>
            <LinearProgress variant="determinate" value={trainingStatus.progress} />
          </CardContent>
        </Card>
      )}

      <Grid container spacing={4}>
        <Grid item xs={12} md={5}>
          <Card sx={{ maxWidth: '500px' }}>
            <CardContent>
              <Typography variant="h2" gutterBottom>{t('trainingPage.uploadTitle')}</Typography>
              <Box
                sx={{
                  border: '2px dashed grey',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#F8F9FA'
                }}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input 
                  id="file-input" 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
                />
                <UploadFileIcon sx={{ fontSize: 48, color: 'grey.500' }} />
                <Typography>{t('trainingPage.uploadArea')}</Typography>
              </Box>
              {imagePreviews.length > 0 && (
                <Box sx={{ 
                  mt: 2, 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
                  gap: '16px',
                  maxHeight: '360px', // Approx 3 rows (100px image + 16px gap) * 3
                  overflowY: 'auto',
                  pr: 1 // Padding to avoid scrollbar overlapping content
                }}>
                  {imagePreviews.map((src, index) => (
                    <Box key={index} sx={{ position: 'relative' }}>
                      <img src={src} alt="preview" width="100%" height="100%" style={{ objectFit: 'cover', borderRadius: '8px' }} />
                      <IconButton size="small" onClick={() => handleRemoveImage(index)} sx={{ position: 'absolute', top: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.7)' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h2" gutterBottom>{t('trainingPage.paramsTitle')}</Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>{t('trainingPage.baseModel')}</InputLabel>
                <Select value={baseModel} label={t('trainingPage.baseModel')} onChange={(e) => setBaseModel(e.target.value)} disabled={isProcessing}>
                  <MenuItem value="runwayml/stable-diffusion-v1-5">runwayml/stable-diffusion-v1-5</MenuItem>
                  {/* Add other models here if available */}
                </Select>
              </FormControl>
              <TextField fullWidth label={t('trainingPage.modelName')} variant="outlined" sx={{ mb: 2 }} value={modelName} onChange={(e) => setModelName(e.target.value)} disabled={isProcessing} />
              <TextField fullWidth label={t('trainingPage.instancePrompt')} variant="outlined" sx={{ mb: 2 }} value={instancePrompt} onChange={(e) => setInstancePrompt(e.target.value)} disabled={isProcessing} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ flexShrink: 0, mr: 2 }}>{t('trainingPage.trainingSteps')}</Typography>
                <Slider value={steps} onChange={(_, newValue) => setSteps(newValue as number)} aria-label="Training Steps" step={100} marks min={100} max={2000} disabled={isProcessing} />
                <Typography sx={{ ml: 2, width: '40px' }}>{steps}</Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ flexShrink: 0, mr: 2 }}>{t('trainingPage.learningRate')}</Typography>
                <Slider value={learningRate} onChange={(_, newValue) => setLearningRate(newValue as number)} aria-label="Learning Rate" step={1e-5} min={1e-5} max={1e-3} scale={(x) => x} disabled={isProcessing} />
                <Typography sx={{ ml: 2, width: '70px' }}>{learningRate.toExponential(1)}</Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ flexShrink: 0, mr: 2 }}>{t('trainingPage.resolution')}</Typography>
                <Tooltip title={t('trainingPage.resolutionTooltip')}>
                  <IconButton size="small"><HelpOutlineIcon fontSize="small" /></IconButton>
                </Tooltip>
                <Slider value={resolution} onChange={(_, newValue) => setResolution(newValue as number)} aria-label="Resolution" step={128} marks min={512} max={1024} disabled={isProcessing} />
                <Typography sx={{ ml: 2, width: '50px' }}>{resolution}px</Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ flexShrink: 0, mr: 2 }}>{t('trainingPage.batchSize')}</Typography>
                <Tooltip title={t('trainingPage.batchSizeTooltip')}>
                  <IconButton size="small"><HelpOutlineIcon fontSize="small" /></IconButton>
                </Tooltip>
                <Slider value={trainBatchSize} onChange={(_, newValue) => setTrainBatchSize(newValue as number)} aria-label="Batch Size" step={1} marks min={1} max={8} disabled={isProcessing} />
                <Typography sx={{ ml: 2, width: '30px' }}>{trainBatchSize}</Typography>
              </Box>

            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        {!isTrainingActive ? (
          <Button variant="contained" color="primary" size="large" onClick={handleStartTraining} disabled={isProcessing} sx={{ minWidth: 150 }}>
            {isProcessing ? <><CircularProgress size={24} color="inherit" sx={{ mr: 1 }} /> {t('trainingPage.training')}</> : t('trainingPage.startTraining')}
          </Button>
        ) : (
          <Button variant="contained" color="error" size="large" onClick={handleCancelTraining} disabled={!isTrainingActive}>
            {t('trainingPage.cancelTraining')}
          </Button>
        )}
      </Box>

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