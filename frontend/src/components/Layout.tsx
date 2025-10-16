
import React, { useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import { Link } from 'react-router-dom';
import ImagesearchRollerIcon from '@mui/icons-material/ImagesearchRoller';

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

const drawer = (
    <div>
      <Toolbar />
      <List>
        <ListItem button component={Link} to="/" key="training">
          <ListItemIcon>
            <ModelTrainingIcon />
          </ListItemIcon>
          <ListItemText primary="LoRA Training" />
        </ListItem>
        <ListItem button component={Link} to="/inference" key="inference">
          <ListItemIcon>
            <ImagesearchRollerIcon />
          </ListItemIcon>
          <ListItemText primary="SD Inference" />
        </ListItem>
        {/* Future pages can be added here */}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Gemini LoRA Training
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        component="nav"
        sx={{ 
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="permanent"
        anchor="left"
      >
        {drawer}
      </Drawer>
      <Box
        component="main"
        sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
