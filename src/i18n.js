import { useState, useEffect } from "react";

import en from "./locales/en.json";
import ru from "./locales/ru.json";
import ge from "./locales/ge.json";

// ── Locale map — add new languages by importing a JSON + adding here ──
export const T = { en, ru, ge };

export const langCodes = Object.keys(T);

export const getLang = () => localStorage.getItem("sc_lang") || "en";
export const setLangValue = (lang) => {
    localStorage.setItem("sc_lang", lang);
    window.dispatchEvent(new Event('sc_lang_change'));
};

export const useLang = () => {
    const [l, setL] = useState(getLang());
    useEffect(() => {
        const onL = () => setL(getLang());
        window.addEventListener('sc_lang_change', onL);
        return () => window.removeEventListener('sc_lang_change', onL);
    }, []);
    return { lang: l, t: T[l] || T.en, setLang: setLangValue };
};
