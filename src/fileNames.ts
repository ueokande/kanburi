export function fileName(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}
export function directory(path: string) {
  return (
    path.slice(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"))) ||
    "/"
  );
}
