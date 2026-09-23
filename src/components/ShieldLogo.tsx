/**
 * @archivo src/components/ShieldLogo.tsx
 * @descripción Componente SVG para el Escudo / Logo Institucional del Instituto José Peña.
 */

import React from 'react';

interface ShieldLogoProps {
  className?: string;
  size?: number;
}

/**
 * @componente ShieldLogo
 * @descripción Renderiza el escudo institucional con la cruz, la antorcha, la estrella y los colores representativos.
 */
export const ShieldLogo: React.FC<ShieldLogoProps> = ({ className = '', size = 56 }) => {
  return (
    <svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 100 115"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Fondo del Escudo con borde doble */}
      <path
        d="M50 5 L92 20 V65 C92 90 50 110 50 110 C50 110 8 90 8 65 V20 L50 5 Z"
        fill="#ffffff"
        stroke="#18243b"
        strokeWidth="3"
      />
      
      {/* Cuadrante Superior Izquierdo - Azul con Estrella y Estelas */}
      <path
        d="M12 22 V55 H48 V10 L12 22 Z"
        fill="#1a365d"
      />
      {/* Estrella */}
      <polygon
        points="22,25 24,30 29,30 25,33 27,38 22,35 17,38 19,33 15,30 20,30"
        fill="#f6e05e"
      />
      {/* Estelas */}
      <line x1="28" y1="28" x2="42" y2="35" stroke="#f6e05e" strokeWidth="2" strokeLinecap="round" />
      <line x1="26" y1="33" x2="40" y2="40" stroke="#f6e05e" strokeWidth="2" strokeLinecap="round" />

      {/* Cuadrante Superior Derecho - Rojo */}
      <path
        d="M52 10 V55 H88 V22 L52 10 Z"
        fill="#c53030"
      />

      {/* Cuadrante Inferior Izquierdo - Azul Marino con Cruz Dorada */}
      <path
        d="M12 59 V65 C12 85 48 103 48 103 V59 H12 Z"
        fill="#2b6cb0"
      />
      {/* Cruz Dorada */}
      <rect x="27" y="65" width="6" height="25" fill="#f6e05e" />
      <rect x="20" y="72" width="20" height="6" fill="#f6e05e" />

      {/* Cuadrante Inferior Derecho - Azul Marino Oscuro con Antorcha */}
      <path
        d="M52 59 V103 C52 103 88 85 88 65 V59 H52 Z"
        fill="#18243b"
      />
      {/* Mango de Antorcha */}
      <path d="M66 90 L74 75 L70 73 L62 88 Z" fill="#cbd5e0" />
      <ellipse cx="72" cy="73" rx="5" ry="3" fill="#dd6b20" />
      {/* Llama */}
      <path d="M72 70 C70 63 76 60 72 54 C80 58 82 66 75 70 Z" fill="#e53e3e" />
      <path d="M72 68 C71 63 74 61 72 58 C76 60 77 65 73 68 Z" fill="#f6e05e" />

      {/* Franja Horizontal Central con Texto */}
      <rect x="6" y="51" width="88" height="13" fill="#ffffff" stroke="#18243b" strokeWidth="2" rx="2" />
      <text
        x="50"
        y="60"
        fill="#18243b"
        fontSize="7.5"
        fontWeight="bold"
        fontFamily="sans-serif"
        textAnchor="middle"
      >
        Instituto José Peña
      </text>

      {/* Borde Exterior Fino */}
      <path
        d="M50 5 L92 20 V65 C92 90 50 110 50 110 C50 110 8 90 8 65 V20 L50 5 Z"
        fill="none"
        stroke="#18243b"
        strokeWidth="2.5"
      />
    </svg>
  );
};
