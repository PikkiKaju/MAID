import { ArrowBigRight } from "lucide-react";
import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-200 p-4">
      <div className="flex items-center flex-col">
        <h1 className="text-7xl font-extrabold text-red-500 mb-4">
          404 Not Found
        </h1>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Strona nie znaleziona
        </h2>
        <Link
          to="/"
          className="px-6 py-3 flex gap-2 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 transition duration-300 ease-in-out"
        >
          Wróć do Strony Głównej <ArrowBigRight />
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
