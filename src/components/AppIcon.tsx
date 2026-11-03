const iconUrl = new URL("../../resources/icon.svg", import.meta.url).href;

export function AppIcon() {
  return <img src={iconUrl} alt="" width={32} height={32} draggable={false} />;
}
