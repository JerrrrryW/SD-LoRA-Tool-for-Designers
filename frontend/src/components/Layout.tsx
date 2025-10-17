
import React, { useState } from 'react';
import {
  AppBar, Box, CssBaseline, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, 
  ListItemText, Toolbar, Typography, Divider, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import { Link, useLocation } from 'react-router-dom';
import ImagesearchRollerIcon from '@mui/icons-material/ImagesearchRoller';
import StorageIcon from '@mui/icons-material/Storage';
import { useTranslation } from 'react-i18next';

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLanguageChange = (event: any) => {
    i18n.changeLanguage(event.target.value);
  };

  const menuItems = [
    { text: t('sidebar.training'), path: '/', icon: <ModelTrainingIcon /> },
    { text: t('sidebar.inference'), path: '/inference', icon: <ImagesearchRollerIcon /> },
    { text: t('sidebar.models'), path: '/models', icon: <StorageIcon /> },
  ];

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar />
      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'rgba(0, 123, 255, 0.08)',
                  borderLeft: '3px solid #007BFF',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 123, 255, 0.12)',
                  },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <FormControl fullWidth>
          <InputLabel id="language-select-label">{t('language')}</InputLabel>
          <Select
            labelId="language-select-label"
            value={i18n.language}
            label={t('language')}
            onChange={handleLanguageChange}
          >
            <MenuItem value={'en'}>English</MenuItem>
            <MenuItem value={'zh'}>中文</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
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
            {t('sidebar.title')}
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
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 3,
          width: '100%',
        }}
      >
        <Toolbar />
        <Box sx={{ maxWidth: '1280px', margin: '0 auto' }}>{children}</Box>
      </Box>
    </Box>
  );
};

export default Layout;
