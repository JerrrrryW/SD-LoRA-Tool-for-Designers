import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container, Typography, Card, CardContent, Grid, Box, CircularProgress, Alert, Button, Dialog, 
  DialogActions, DialogContent, DialogContentText, DialogTitle, CardActions, CardMedia, TextField, IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

interface LoRAModel {
  name: string; // This is the folder name, used as ID
  model_name: string; // This is the user-defined name
  base_model: string;
  prompt: string;
  creation_time: string;
  thumbnail_url?: string; // Optional thumbnail
}

const ModelsPage: React.FC = () => {
  const [models, setModels] = useState<LoRAModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedModel, setSelectedModel] = useState<LoRAModel | null>(null);
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

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

  const handleRenameStart = (model: LoRAModel) => {
    setEditingModel(model.name);
    setNewName(model.model_name);
  };

  const handleRenameCancel = () => {
    setEditingModel(null);
    setNewName('');
  };

  const handleRenameSave = async (originalName: string) => {
    try {
      await axios.put(`http://localhost:8000/models/rename/${originalName}`, { new_name: newName });
      setEditingModel(null);
      setNewName('');
      fetchModels();
    } catch (err) {
      setError(`Failed to rename model.`);
      console.error(err);
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
              <CardMedia
                component="img"
                height="140"
                image={model.thumbnail_url || 'https://via.placeholder.com/300x140.png?text=No+Preview'}
                alt={`Preview for ${model.model_name}`}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                {editingModel === model.name ? (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TextField 
                      value={newName} 
                      onChange={(e) => setNewName(e.target.value)} 
                      size="small" 
                      variant="outlined"
                      fullWidth
                    />
                    <IconButton onClick={() => handleRenameSave(model.name)} size="small"><SaveIcon /></IconButton>
                    <IconButton onClick={handleRenameCancel} size="small"><CancelIcon /></IconButton>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6" component="div">
                      {model.model_name}
                    </Typography>
                    <IconButton onClick={() => handleRenameStart(model)} size="small"><EditIcon /></IconButton>
                  </Box>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  ID: {model.name}
                </Typography>
                <Typography sx={{ mt: 1.5 }} color="text.secondary">
                  Base Model: <strong>{model.base_model}</strong>
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
            Are you sure you want to delete the model "{selectedModel?.model_name}"? This action cannot be undone.
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
