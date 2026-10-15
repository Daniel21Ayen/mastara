// apps/admin-web/src/shared/ui/Icon.tsx

/** Small line icons drawn with `currentColor`, so they follow the text colour (always beside text or labelled). */
const PATHS = {
  module: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  note: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  translate: 'M4 5h9M8.5 3v2M6 5c0 4 3 7 7 8M12 5c0 3-3 6-7 8M14 20l4-9 4 9M15.5 17h5',
  quiz: 'M5 5h14v14H5zM9 9h6M9 13h6M9 16h3',
  check: 'M5 12l5 5 9-10',
  plus: 'M12 5v14M5 12h14',
  chevronDown: 'M6 9l6 6 6-6',
  chevronUp: 'M6 15l6-6 6 6',
  dots: 'M12 6h.01M12 12h.01M12 18h.01',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  book: 'M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM4 19V5M9 7h5',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
