// Toast.js
import React from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Helper functions to mimic alert()
export const notifySuccess = (message) => toast.success(message);
export const notifyError = (message) => toast.error(message);
export const notifyInfo = (message) => toast.info(message);
export const notifyWarning = (message) => toast.warning(message);

export const Toast = () => (
  <ToastContainer
    position="top-right"
    autoClose={1000} // auto close after 3 seconds
    hideProgressBar={false}
    newestOnTop={true}
    closeOnClick
    pauseOnHover
    draggable
  />
);
