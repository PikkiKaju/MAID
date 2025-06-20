import { LogIn, Search, User2Icon, UserPlus, XIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logout } from "../features/auth/authSlice";
import { clearSearchTerm, setSearchTerm } from "../features/search/searchSlice";

function Topbar() {
  const dispatch = useAppDispatch();
  const { isLoggedIn } = useAppSelector((state) => state.auth);
  const searchTerm = useAppSelector((state) => state.search.term.toLowerCase());

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setSearchTerm(e.target.value));
  };

  const handleSearchClear = () => {
    dispatch(clearSearchTerm());
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2">
            <Search className="text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Szukaj..."
            className="border border-gray-400 rounded-full px-3 py-1 md:w-108 lg:w-156"
            value={searchTerm}
            onChange={handleSearchChange}
            maxLength={100}
          />
          {searchTerm && (
            <button className="cursor-pointer hover:bg-gray-200 rounded-full p-2">
              <XIcon className="text-gray-500" onClick={handleSearchClear} />
            </button>
          )}
        </div>
        <div className="flex gap-4">
          {!isLoggedIn ? (
            <>
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
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 bg-transparent border border-gray-400 text-black px-4 py-2 rounded-full">
                <User2Icon className="w-4" />
                <span>Adam</span>
              </div>
              <button
                className="flex items-center gap-1 bg-black text-white px-4 py-2 rounded-full hover:cursor-pointer hover:bg-gray-600"
                onClick={handleLogout}
              >
                Wyloguj
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default Topbar;
