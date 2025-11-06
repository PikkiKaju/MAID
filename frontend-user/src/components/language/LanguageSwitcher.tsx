import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const toggleLanguage = () => {
    const newLanguage = currentLanguage === "en" ? "pl" : "en";
    i18n.changeLanguage(newLanguage);
    localStorage.setItem("maid-language", newLanguage);
  };

  const { t } = useTranslation();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-md flex items-center justify-center p-[2px] overflow-hidden"
      onClick={toggleLanguage}
      title={`${t("language.switchTo")} ${
        currentLanguage === "en" ? t("language.polish") : t("language.english")
      }`}
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
