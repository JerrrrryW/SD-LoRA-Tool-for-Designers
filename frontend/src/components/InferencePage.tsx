
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Box,
  CircularProgress,
  Snackbar,
  Alert,
  Paper,
  LinearProgress, // Import LinearProgress
} from '@mui/material';

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
          setGeneratedImage(`http://localhost:8000/generate/image/${newStatus.image_id}`);
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

  const isTaskActive = status.status === 'loading' || status.status === 'processing';

  return (
    <Container maxWidth="lg">
      <Card>
        <CardContent>
          <Typography variant="h4" component="h1" gutterBottom>
            Stable Diffusion Inference
          </Typography>

          {isTaskActive && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>{status.message}</Typography>
              <LinearProgress variant="determinate" value={status.progress} />
            </Box>
          )}

          <Box sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="Prompt (e.g., 'a beautiful landscape painting')"
              variant="outlined"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isProcessing}
              multiline
              rows={3}
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
              rows={2}
            />
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleGenerateImage}
              disabled={isProcessing}
            >
              {isProcessing ? <CircularProgress size={24} color="inherit" /> : 'Generate Image'}
            </Button>
          </Box>

          {generatedImage && (
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>Generated Image</Typography>
              <Paper elevation={3} sx={{ display: 'inline-block' }}>
                <img src={generatedImage} alt="Generated by Stable Diffusion" style={{ maxWidth: '100%', borderRadius: '4px' }} />
              </Paper>
            </Box>
          )}
        </CardContent>
      </Card>

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
