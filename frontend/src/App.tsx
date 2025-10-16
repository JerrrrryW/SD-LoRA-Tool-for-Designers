import React from 'react';
import TrainingPage from './components/TrainingPage';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

// A simple theme for a professional look
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TrainingPage />
    </ThemeProvider>
  );
}

export default App;