import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import TrainingPage from './components/TrainingPage';
import InferencePage from './components/InferencePage';
import { ThemeProvider, createTheme } from '@mui/material';
import CanvasPage from './components/CanvasPage';

// A simple theme for a professional look
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#007BFF', // A more modern, vibrant blue
    },
    secondary: {
      main: '#6C757D', // A calm gray for secondary elements
    },
    background: {
      default: '#F8F9FA', // A very light gray for the main background
      paper: '#FFFFFF', // White for cards and paper elements
    },
    text: {
      primary: '#212529', // Dark gray for primary text
      secondary: '#6C757D', // Lighter gray for secondary text
    },
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    h1: {
      fontSize: '28px',
      fontWeight: 700,
    },
    h2: {
      fontSize: '20px',
      fontWeight: 500,
    },
    body1: {
      fontSize: '14px',
      fontWeight: 400,
    },
    body2: {
      fontSize: '12px',
      fontWeight: 400,
    },
  },
  spacing: 8, // Base spacing unit is 8px
});

import ModelsPage from './components/ModelsPage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<TrainingPage />} />
            <Route path="/inference" element={<InferencePage />} />
            <Route path="/models" element={<ModelsPage />} />
            <Route path="/canvas" element={<CanvasPage />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
