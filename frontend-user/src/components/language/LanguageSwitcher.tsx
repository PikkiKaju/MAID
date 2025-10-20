import { useState } from "react";
import { Button } from "../../ui/button";

type Language = "en" | "pl";

export function LanguageSwitcher() {
  const [currentLanguage, setCurrentLanguage] = useState<Language>("en");

  const toggleLanguage = () => {
    setCurrentLanguage(currentLanguage === "en" ? "pl" : "en");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-full p-0 overflow-hidden"
      onClick={toggleLanguage}
      title={`Switch to ${currentLanguage === "en" ? "Polish" : "English"}`}
    >
      <div className="relative w-full h-full flex">
        {currentLanguage === "en" ? (
          // UK Flag
          <div className="w-full h-full relative bg-blue-600">
            {/* Red cross */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-[2px] bg-red-600"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-full w-[2px] bg-red-600"></div>
            </div>
            {/* White cross */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-[4px] bg-white"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-full w-[4px] bg-white"></div>
            </div>
            {/* Red cross on top */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-[2px] bg-red-600"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-full w-[2px] bg-red-600"></div>
            </div>
          </div>
        ) : (
          // Polish Flag
          <div className="w-full h-full flex flex-col">
            <div className="flex-1 bg-white"></div>
            <div className="flex-1 bg-red-600"></div>
          </div>
        )}
      </div>
    </Button>
  );
}
