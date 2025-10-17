import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Container, Typography, Card, CardContent, Button, TextField, Box, CircularProgress, Snackbar, Alert, 
  Paper, LinearProgress, Select, MenuItem, FormControl, InputLabel, Grid, Skeleton, IconButton
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface LoRAModel {
  name: string;
  prompt: string;
  creation_time: string;
}

interface InferenceStatus {
  status: 'idle' | 'loading' | 'processing' | 'completed' | 'failed';
  progress: number;
  step: number;
  total_steps: number;
  message: string;
  image_id: string | null;
}

const InferencePage: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedLora, setSelectedLora] = useState('None');
  const [loraModels, setLoraModels] = useState<LoRAModel[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<InferenceStatus>({ 
    status: 'idle', 
    progress: 0, 
    step: 0, 
    total_steps: 50, 
    message: '', 
    image_id: null 
  });
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' } | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Effect to fetch LoRA models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await axios.get('http://localhost:8000/models');
        setLoraModels(response.data);
      } catch (err) {
        console.error("Failed to fetch LoRA models:", err);
      }
    };
    fetchModels();
  }, []);

  // Effect for polling
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await axios.get('http://localhost:8000/generate/status');
        const newStatus: InferenceStatus = response.data;
        setStatus(newStatus);

        if (newStatus.status === 'completed') {
          if (pollingInterval.current) clearInterval(pollingInterval.current);
          setIsProcessing(false);
          setGeneratedImage(`http://localhost:8000/generate/image/${newStatus.image_id}?t=${new Date().getTime()}`);
          setSnackbar({ open: true, message: 'Image generated successfully!', severity: 'success' });
        } else if (newStatus.status === 'failed') {
          if (pollingInterval.current) clearInterval(pollingInterval.current);
          setIsProcessing(false);
          setSnackbar({ open: true, message: newStatus.message, severity: 'error' });
        }
      } catch (error) {
        console.error("Failed to poll status:", error);
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        setIsProcessing(false);
      }
    };

    if (isProcessing) {
      pollingInterval.current = setInterval(pollStatus, 1500);
    } else {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    }

    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, [isProcessing]);


  const handleGenerateImage = async () => {
    if (!prompt) {
      setSnackbar({ open: true, message: 'Please enter a prompt.', severity: 'error' });
      return;
    }

    setIsProcessing(true);
    setGeneratedImage(null);
    setStatus({ ...status, status: 'loading', message: 'Sending request to server...' });

    try {
      await axios.post('http://localhost:8000/generate', {
        prompt,
        negative_prompt: negativePrompt,
        lora_model: selectedLora === 'None' ? null : selectedLora,
      });
    } catch (error) {
      let message = 'An unknown error occurred.';
      if (axios.isAxiosError(error) && error.response) {
        message = error.response.data.detail || error.response.data.message || message;
      }
      setSnackbar({ open: true, message, severity: 'error' });
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `generated_image_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const isTaskActive = status.status === 'loading' || status.status === 'processing';

  return (
    <Container maxWidth={false}>
      <Typography variant="h4" component="h1" gutterBottom>
        Stable Diffusion Inference
      </Typography>
      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Card sx={{ minWidth: 512 }}>
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom>Parameters</Typography>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel id="lora-select-label">Use LoRA Model (Optional)</InputLabel>
                <Select
                  labelId="lora-select-label"
                  value={selectedLora}
                  label="Use LoRA Model (Optional)"
                  onChange={(e) => setSelectedLora(e.target.value)}
                  disabled={isProcessing}
                >
                  <MenuItem value="None">None (Base Model Only)</MenuItem>
                  {loraModels.map((model) => (
                    <MenuItem key={model.name} value={model.name}>
                      {model.name} 
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ mt: 3 }}>
                <TextField
                  fullWidth
                  label="Prompt (e.g., 'a beautiful landscape painting')"
                  variant="outlined"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isProcessing}
                  multiline
                  rows={4}
                />
              </Box>

              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="Negative Prompt (e.g., 'blurry, low quality')"
                  variant="outlined"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  disabled={isProcessing}
                  multiline
                  rows={3}
                />
              </Box>

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleGenerateImage}
                  disabled={isProcessing}
                  sx={{ width: '100%' }}
                >
                  {isProcessing ? <CircularProgress size={24} color="inherit" /> : 'Generate Image'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%', minWidth: 512 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="h5" component="h2" gutterBottom>Result</Typography>
              <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FA', borderRadius: 1, minHeight: 512 }}>
                {isTaskActive && (
                  <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress size={60} />
                    <Typography variant="h6" sx={{ mt: 2 }}>{status.message}</Typography>
                    <LinearProgress variant="determinate" value={status.progress} sx={{ width: '80%', margin: '16px auto' }} />
                  </Box>
                )}
                {!isTaskActive && generatedImage && (
                  <Paper elevation={3} sx={{ display: 'inline-block', lineHeight: 0 }}>
                    <img src={generatedImage} alt="Generated by Stable Diffusion" style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '4px' }} />
                  </Paper>
                )}
                 {!isTaskActive && !generatedImage && (
                  <Typography variant="body1" color="text.secondary">Image will appear here</Typography>
                )}
              </Box>
              {generatedImage && !isTaskActive && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
                  <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload}>
                    Download
                  </Button>
                  <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => navigator.clipboard.writeText('Seed value not available')}>
                    Copy Seed
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {snackbar && (
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setSnackbar(null)} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      )}
    </Container>
  );
};

export default InferencePage;
