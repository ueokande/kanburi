export function WorkspaceIcon({
  name,
}: {
  name: "board" | "file" | "settings";
}) {
  return (
    <svg
      width={name === "board" ? 28 : 20}
      height={name === "board" ? 28 : 20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "board" ? (
        <>
          <rect
            x="1"
            y="2"
            width="6"
            height="20"
            rx="1"
            fill="currentColor"
            stroke="none"
          />
          <rect
            x="9"
            y="2"
            width="6"
            height="20"
            rx="1"
            fill="currentColor"
            stroke="none"
          />
          <rect
            x="17"
            y="2"
            width="6"
            height="20"
            rx="1"
            fill="currentColor"
            stroke="none"
          />
          <path d="M3 8h2m6 0h2m6 0h2" stroke="white" />
        </>
      ) : name === "file" ? (
        <>
          <path d="M14 2H5a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8z" />
          <path d="M14 2v6h6M8 12h8M8 16h8" />
        </>
      ) : (
        <>
          <path d="m9.5 3-.6 2-1.5.9-2-.5L3 9.5 4.5 11v2L3 14.5l2.4 4.1 2-.5 1.5.9.6 2h5l.6-2 1.5-.9 2 .5 2.4-4.1-1.5-1.5v-2L21 9.5l-2.4-4.1-2 .5-1.5-.9-.6-2z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}
