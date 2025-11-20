import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Label } from "../ui/label";
import { useTranslation } from "react-i18next";

function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side content */}
      <div className="flex flex-col justify-center px-10 lg:px-24 w-full lg:w-1/2">
        <Label className="text-5xl font-bold mb-4 text-primary">
          <span className="text-red-500 font-semibold mr-4">404</span>
          {t("notFound.title")}
        </Label>
        <p className="text-secondary mb-8">{t("notFound.description")}</p>
        <Link
          to="/"
          className="inline-flex items-center text-indigo-500 hover:text-indigo-300 font-semibold cursor-pointer"
        >
          <ChevronLeft className="size-5" />
          {t("notFound.backToHome")}
        </Link>
      </div>

      {/* Right side image */}
      <div className="hidden lg:block w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80"
          alt="Night sky desert"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}

export default NotFoundPage;
