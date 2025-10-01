import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Folder, HomeIcon, Upload, PanelsTopLeft } from "lucide-react";

function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showText, setShowText] = useState(true);

  // Effect for sidebar smooth animation
  useEffect(() => {
    if (sidebarOpen) {
      const timeout = setTimeout(() => setShowText(true), 260);
      return () => clearTimeout(timeout);
    } else {
      setShowText(false);
    }
  }, [sidebarOpen]);

  return (
    <div
      className={` top-0 left-0 h-full bg-blue-900 text-white flex flex-col p-3 transition-all duration-300 ease-in-out ${
        sidebarOpen ? "w-48" : "w-14"
      }`}
    >
      <div className="flex items-center mb-6">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-white text-l rounded-full cursor-pointer border w-8 h-8 hover:bg-blue-800 "
        >
          ☰
        </button>
        {showText && (
          <h1 className="text-l font-bold pl-6 transition-opacity duration-300 opacity-100">
            Maid App
          </h1>
        )}
      </div>
      <nav>
        {/* Home Link */}
        <Link
          to="/"
          className="block py-1 px-2 hover:bg-blue-800 rounded flex gap-2 items-center"
        >
          <HomeIcon className="w-4" />
          {showText && (
            <span className="transition-opacity duration-300 opacity-100">
              Home
            </span>
          )}
        </Link>

        {/* My Projects Link */}
        <Link
          to="/projects"
          className="block py-1 px-2 hover:bg-blue-800 rounded flex gap-2 items-center"
        >
          <Folder className="w-4" />
          {showText && (
            <span className="transition-opacity duration-300 opacity-100">
              My Projects
            </span>
          )}
        </Link>

        {/* Datasets Link */}
        <Link
          to="/datasets-regresja"
          className="block py-1 px-2 hover:bg-blue-800 rounded flex gap-2 items-center"
        >
          <Upload className="w-4" />
          {showText && (
            <span className="transition-opacity duration-300 opacity-100">
              Datasets
            </span>
          )}
        </Link>

        {/* Canvas Link */}
        <Link
          to="/canvas"
          className="block py-1 px-2 hover:bg-blue-800 rounded flex gap-2 items-center"
        >
          <PanelsTopLeft className="w-4" />
          {showText && (
            <span className="transition-opacity duration-300 opacity-100">
              Canvas
            </span>
          )}
        </Link>
      </nav>
    </div>
  );
}

export default Sidebar;
