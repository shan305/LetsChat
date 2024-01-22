import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const root = document.getElementById('root');

const rootElement = ReactDOM.createRoot(root);
rootElement.render(
  <React.StrictMode>
    <App />
    <ToastContainer />
  </React.StrictMode>
);
