
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Box,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CardActions, // Import CardActions
} from '@mui/material';

interface LoRAModel {
  name: string;
  prompt: string;
  creation_time: string;
}

const ModelsPage: React.FC = () => {
  const [models, setModels] = useState<LoRAModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedModel, setSelectedModel] = useState<LoRAModel | null>(null);

  const fetchModels = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('http://localhost:8000/models');
      setModels(response.data);
    } catch (err) {
      setError('Failed to fetch models. Is the backend server running?');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleDownload = (modelName: string) => {
    window.open(`http://localhost:8000/models/download/${modelName}`);
  };

  const handleDeleteClick = (model: LoRAModel) => {
    setSelectedModel(model);
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedModel) {
      try {
        await axios.delete(`http://localhost:8000/models/delete/${selectedModel.name}`);
        setOpenDeleteDialog(false);
        setSelectedModel(null);
        fetchModels(); // Refresh the model list
      } catch (err) {
        setError(`Failed to delete model ${selectedModel.name}.`);
        console.error(err);
      }
    }
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Trained LoRA Models
      </Typography>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
      )}

      {!isLoading && !error && models.length === 0 && (
        <Typography sx={{ mt: 4 }}>No trained models found.</Typography>
      )}

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {models.map((model) => (
          <Grid item xs={12} sm={6} md={4} key={model.name}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" component="div">
                  {model.name}
                </Typography>
                <Typography sx={{ mt: 1.5 }} color="text.secondary">
                  Instance Prompt: <strong>{model.prompt}</strong>
                </Typography>
                <Typography sx={{ mt: 1 }} color="text.secondary">
                  Created: {new Date(model.creation_time).toLocaleString()}
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => handleDownload(model.name)}>Download</Button>
                <Button size="small" color="error" onClick={() => handleDeleteClick(model)}>Delete</Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the model "{selectedModel?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ModelsPage;
