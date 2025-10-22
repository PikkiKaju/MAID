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
      className="h-9 w-9 rounded-md flex items-center justify-center p-[2px] overflow-hidden"
      onClick={toggleLanguage}
      title={`Switch to ${currentLanguage === "en" ? "Polish" : "English"}`}
    >
      <div>
        {currentLanguage === "en" ? (
          // UK Flag
          <div className="bg-[url('/united-kingdom_flag.svg')] size-5 bg-cover bg-no-repeat bg-center"></div>
        ) : (
          // Polish Flag
          <div className="bg-[url('/poland-flag.svg')] size-5 bg-cover bg-no-repeat bg-center"></div>
        )}
      </div>
    </Button>
  );
}
