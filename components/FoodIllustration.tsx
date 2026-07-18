export default function FoodIllustration({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      className={`food-illustration${compact ? " food-illustration--compact" : ""}`}
      viewBox="0 0 420 360"
      role="img"
      aria-label="Et åbent køleskab med friske madvarer"
    >
      <defs>
        <linearGradient id="fridge-body" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fffdf8" />
          <stop offset="1" stopColor="#e8f2e8" />
        </linearGradient>
        <linearGradient id="fridge-door" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f6d3b8" />
          <stop offset="1" stopColor="#e6a575" />
        </linearGradient>
      </defs>

      <circle cx="208" cy="182" r="158" fill="#e6efe4" />
      <circle cx="76" cy="78" r="18" fill="#f2c85b" opacity=".72" />
      <circle cx="350" cy="88" r="28" fill="#f4d9c6" opacity=".8" />
      <path d="M52 252c38-24 74-20 108 12" fill="none" stroke="#88aa83" strokeWidth="13" strokeLinecap="round" opacity=".45" />

      <rect x="112" y="54" width="190" height="258" rx="28" fill="url(#fridge-body)" stroke="#224b43" strokeWidth="7" />
      <rect x="132" y="79" width="150" height="205" rx="18" fill="#fbfaf4" stroke="#9ab1a8" strokeWidth="4" />
      <path d="M132 145h150M132 210h150" stroke="#9ab1a8" strokeWidth="4" />

      <rect x="150" y="99" width="42" height="38" rx="8" fill="#f0c95f" />
      <path d="m151 104 12-13h17l11 13" fill="#ffe6a4" stroke="#224b43" strokeWidth="3" strokeLinejoin="round" />
      <rect x="214" y="105" width="44" height="31" rx="14" fill="#d9825d" />
      <path d="M224 105c3-13 19-14 23 0" fill="none" stroke="#527c51" strokeWidth="5" strokeLinecap="round" />

      <path d="M151 184c0-21 16-32 34-32s34 11 34 32v16h-68v-16Z" fill="#79a96c" />
      <path d="M176 157c-8-17 5-25 14-13M187 159c5-18 19-19 23-8" fill="none" stroke="#376748" strokeWidth="6" strokeLinecap="round" />
      <rect x="232" y="162" width="31" height="39" rx="8" fill="#f2b666" />
      <path d="M240 162v-11h15v11" fill="none" stroke="#224b43" strokeWidth="4" strokeLinejoin="round" />

      <ellipse cx="171" cy="248" rx="27" ry="24" fill="#db6e4e" />
      <path d="M168 225c-7-11 3-19 11-12" fill="none" stroke="#527c51" strokeWidth="5" strokeLinecap="round" />
      <rect x="216" y="224" width="49" height="48" rx="10" fill="#83b8b0" />
      <path d="M224 237h33M224 248h25" stroke="#f8f3e9" strokeWidth="4" strokeLinecap="round" />

      <path d="M302 82c57 26 79 92 77 173-1 27-17 48-43 55l-34 9V82Z" fill="url(#fridge-door)" stroke="#224b43" strokeWidth="7" strokeLinejoin="round" />
      <path d="M327 126v130" stroke="#fff5e9" strokeWidth="12" strokeLinecap="round" opacity=".72" />
      <path d="M303 107h17M303 277h17" stroke="#224b43" strokeWidth="5" strokeLinecap="round" />
      <path d="M155 326h32M260 326h32" stroke="#224b43" strokeWidth="10" strokeLinecap="round" />
    </svg>
  );
}
