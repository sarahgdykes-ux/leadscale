import type { PropertyStyle } from "@/lib/properties";

export function PropertyArtwork({
  style,
  className = "",
}: {
  style: PropertyStyle;
  className?: string;
}) {
  return (
    <div
      className={`property-artwork property-artwork--${style} ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 560 280" role="presentation">
        <path className="artwork-hill artwork-hill--back" d="M0 190 Q130 132 260 188 T560 174 V280 H0Z" />
        <path className="artwork-hill artwork-hill--front" d="M0 220 Q140 176 290 220 T560 205 V280 H0Z" />
        {style === "condo" ? (
          <g className="artwork-home">
            <rect x="176" y="64" width="188" height="158" rx="3" />
            <path className="artwork-roof" d="M163 66 H377 L364 48 H176Z" />
            <path className="artwork-window" d="M198 88 H230 V119 H198Z M251 88 H283 V119 H251Z M304 88 H336 V119 H304Z M198 139 H230 V170 H198Z M251 139 H283 V170 H251Z M304 139 H336 V170 H304Z" />
            <rect className="artwork-door" x="254" y="181" width="34" height="41" />
          </g>
        ) : style === "modern" ? (
          <g className="artwork-home">
            <path d="M151 112 H390 V222 H151Z" />
            <path className="artwork-roof" d="M136 104 H406 V119 H136Z" />
            <path className="artwork-window" d="M173 132 H248 V193 H173Z M270 132 H300 V161 H270Z" />
            <rect className="artwork-door" x="319" y="160" width="39" height="62" />
          </g>
        ) : style === "townhouse" ? (
          <g className="artwork-home">
            <path d="M180 82 H366 V222 H180Z" />
            <path className="artwork-roof" d="M168 82 L273 40 L379 82Z" />
            <path className="artwork-window" d="M203 101 H237 V133 H203Z M305 101 H339 V133 H305Z M203 151 H237 V181 H203Z M305 151 H339 V181 H305Z" />
            <rect className="artwork-door" x="258" y="174" width="32" height="48" />
          </g>
        ) : (
          <g className="artwork-home">
            <path d="M164 115 L280 47 L396 115 V222 H164Z" />
            <path className="artwork-roof" d="M145 117 L280 35 L415 117 L404 130 L280 55 L156 130Z" />
            <path className="artwork-window" d="M190 133 H230 V172 H190Z M330 133 H370 V172 H330Z" />
            <rect className="artwork-door" x="259" y="163" width="42" height="59" />
          </g>
        )}
        <path className="artwork-path" d="M279 222 Q256 246 263 280 H337 Q329 245 293 222Z" />
        <g className="artwork-tree">
          <path d="M82 222 V155 H96 V222Z" />
          <circle cx="89" cy="139" r="36" />
          <circle cx="61" cy="159" r="24" />
          <circle cx="115" cy="160" r="25" />
        </g>
        <g className="artwork-tree artwork-tree--small">
          <path d="M455 222 V175 H466 V222Z" />
          <circle cx="461" cy="160" r="26" />
          <circle cx="442" cy="174" r="17" />
          <circle cx="480" cy="175" r="18" />
        </g>
      </svg>
    </div>
  );
}
