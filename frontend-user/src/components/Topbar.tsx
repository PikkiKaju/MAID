import { LogIn, Search, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

function Topbar() {
  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Search className="text-gray-500" />
          <input
            type="text"
            placeholder="Szukaj..."
            className="border border-gray-400 rounded-full px-3 py-1 md:w-108 lg:w-156"
          />
        </div>
        <div className="flex gap-4">
          <Link
            to="/register"
            className="flex items-center gap-1 bg-transparent border border-gray-400 text-black px-4 py-2 rounded-full hover:bg-gray-200"
          >
            <UserPlus className="w-4" /> Rejestracja
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-1 bg-black text-white px-4 py-2 rounded-full hover:bg-gray-600"
          >
            <LogIn className="w-4" /> Logowanie
          </Link>
        </div>
      </div>
    </>
  );
}

export default Topbar;
