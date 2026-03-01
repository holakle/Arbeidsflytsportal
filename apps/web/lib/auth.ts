export function getDevToken(): string {
  return process.env.NEXT_PUBLIC_DEV_TOKEN ?? '';
}

