// app/components/ThemeToggle.tsx
'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        const currentTheme = document.documentElement.getAttribute('data-user-color-scheme') || 'light';
        setTheme(currentTheme);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-user-color-scheme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    return (
        <button
            onClick={toggleTheme}
            className="theme-switch-btn"
            style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }}
        >
            {theme === 'light' ? '🌙 Mode Sombre' : '☀️ Mode Clair'}
        </button>
    );
}