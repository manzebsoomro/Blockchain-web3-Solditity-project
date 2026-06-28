import { useState } from "react";
import { Check } from "lucide-react";

type SettingsType = {
  emailNotifications: boolean;
  securityConfirmation: boolean;
  theme: string;
  language: string;
};

export default function Settings() {
  const [settings, setSettings] = useState<SettingsType>({
    emailNotifications: true,
    securityConfirmation: true,
    theme: "dark",
    language: "en",
  });

  const [saved, setSaved] = useState(false);

  const handleToggle = (key: keyof SettingsType) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelect = (key: keyof SettingsType, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your preferences</p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Email Notifications */}
          <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Email Notifications</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Receive email updates about mint requests and transactions
                </p>
              </div>
              <button
                onClick={() => handleToggle("emailNotifications")}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  settings.emailNotifications
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    settings.emailNotifications ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Security Confirmation */}
          <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Security Confirmation</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Require confirmation for sensitive actions
                </p>
              </div>
              <button
                onClick={() => handleToggle("securityConfirmation")}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  settings.securityConfirmation
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    settings.securityConfirmation ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Theme Selection */}
          <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-foreground">Preferred Theme</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Choose your preferred color scheme
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect("theme", option.value)}
                  className={`p-3 rounded-md border-2 transition-all ${
                    settings.theme === option.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Language Selection */}
          <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-foreground">Language</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Select your preferred language
              </p>
            </div>
            <select
              value={settings.language}
              onChange={(e) => handleSelect("language", e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-150 appearance-none cursor-pointer"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="zh">中文</option>
            </select>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="btn btn-primary w-full"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" />
              Settings Saved
            </>
          ) : (
            "Save Settings"
          )}
        </button>
      </div>
    </div>
  );
}
