import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// @ts-ignore - Check if root already exists to prevent React 18 warning during HMR
let root = rootElement._reactRootContainer;

if (!root) {
  root = ReactDOM.createRoot(rootElement);
  // @ts-ignore
  rootElement._reactRootContainer = root;
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);