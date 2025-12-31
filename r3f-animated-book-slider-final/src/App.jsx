import { Routes, Route, useLocation } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import MouseReactivePage from "./pages/MouseReactivePage.jsx";
import MenuPage from "./pages/MenuPage.jsx";
import ParticleTestPage from "./pages/ParticleTestPage.jsx";
import TestPage from "./pages/TestPage.jsx";
import FogTestPage from "./pages/FogTestPage.jsx";
import ModelInspectorPage from "./pages/ModelInspectorPage.jsx";
import { PortfolioPage } from "./components/PortfolioPage.jsx";
import { useEffect } from "react";

export default function App() {
  const loc = useLocation();

  // tag body so you can scope CSS per route if needed
  useEffect(() => {
    document.body.dataset.route = loc.pathname.replace("/", "") || "landing";
    return () => { delete document.body.dataset.route; };
  }, [loc.pathname]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/mouse-reactive" element={<MouseReactivePage />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/portfolio" element={<PortfolioPage />} />
      <Route path="/particle-test" element={<ParticleTestPage />} />
      <Route path="/test-book" element={<TestPage />} />
      <Route path="/fog-test" element={<FogTestPage />} />
      <Route path="/dream" element={<TestPage />} />
      <Route path="/inspect-model" element={<ModelInspectorPage />} />
      {/* add other pages here */}
    </Routes>
  );
}
