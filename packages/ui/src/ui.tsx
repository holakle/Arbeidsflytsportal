import * as React from 'react';

export const tokens = {
  colors: {
    bg: '#f4f7f6',
    surface: '#ffffff',
    text: '#0f172a',
    accent: '#0f766e',
    border: '#d0d7de',
  },
};

export function Card(props: React.PropsWithChildren<{ title: string }>) {
  return (
    <section
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: 12,
        padding: 16,
      }}
    >
      <h3 style={{ marginTop: 0 }}>{props.title}</h3>
      {props.children}
    </section>
  );
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        background: tokens.colors.accent,
        color: '#fff',
        border: 0,
        borderRadius: 8,
        padding: '10px 14px',
        cursor: 'pointer',
      }}
    />
  );
}
