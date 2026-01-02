// src/Components/Footer.js
import React from 'react';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-3 px-6 bg-white border-t border-slate-200 text-center">
      <p className="text-sm text-slate-500">
        {currentYear} Let's Chat. All rights reserved.
      </p>
    </footer>
  );
}

export default Footer;