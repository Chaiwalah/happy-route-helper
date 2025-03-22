
"use client"

import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      return savedTheme;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="rounded-full"
    >
      {theme === "light" ? (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      )}
    </Button>
  );
}
