import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Link } from "react-router-dom";
import { Experience } from "./Experience";

export const PortfolioPage = () => {
  return (
    <div className="relative w-full h-screen" style={{
      backgroundImage: 'url("/images/fullertonjef_a_low_ground-level_angle_almost_as_if_the_camera_i_4cab98a3-f5c4-47b5-98bb-94d2f03e84de.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
      <Loader />
      <Canvas shadows camera={{
          position: [-0.5, 1, window.innerWidth > 800 ? 4 : 9],
          fov: 45,
        }}>
        <group position-y={0}>
          <Suspense fallback={null}>
            <Experience />
          </Suspense>
        </group>
      </Canvas>
      
      {/* Navigation */}
      <div className="absolute top-8 left-8 z-10">
        <Link 
          to="/" 
          className="bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-full hover:bg-white/30 transition-all duration-300 border border-white/30"
        >
          ← Home
        </Link>
      </div>
      
      {/* Portfolio Title */}
      <div className="absolute top-8 right-8 text-white z-10">
        <h2 className="text-2xl font-bold">Interactive Portfolio</h2>
        <p className="text-sm opacity-80">Hover over the book to interact</p>
      </div>
    </div>
  );
};