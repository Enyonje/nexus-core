import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import SupportOpsRoutes from "./routes/SupportOpsRoutes";

export default function App() {
  return (
    <>
      <Toaster />
      <AnimatePresence>
        <Routes location={useLocation()} key={useLocation().key}>
          <Route path="/*" element={<SupportOpsRoutes />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}