import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';

export interface SignaturePadRef {
  clearSignature: () => void;
  readSignature: () => void;
}

interface Props {
  onOK: (sig: string) => void;
  webStyle?: string;
}

const SignaturePad = forwardRef<SignaturePadRef, Props>(({ onOK }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  useImperativeHandle(ref, () => ({
    clearSignature: () => {
      const c = canvasRef.current;
      if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    },
    readSignature: () => {
      const c = canvasRef.current;
      if (c) onOK(c.toDataURL('image/png'));
    },
  }));

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const pos = (e: MouseEvent | TouchEvent) => {
      const r = c.getBoundingClientRect();
      const scaleX = c.width / r.width;
      const scaleY = c.height / r.height;
      const src = 'touches' in e ? e.touches[0] : e as MouseEvent;
      return { x: (src.clientX - r.left) * scaleX, y: (src.clientY - r.top) * scaleY };
    };

    const start = (e: MouseEvent | TouchEvent) => {
      drawing.current = true;
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    };
    const move = (e: MouseEvent | TouchEvent) => {
      if (!drawing.current) return;
      e.preventDefault();
      const p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    };
    const stop = () => { drawing.current = false; };

    c.addEventListener('mousedown', start);
    c.addEventListener('mousemove', move);
    c.addEventListener('mouseup', stop);
    c.addEventListener('mouseleave', stop);
    c.addEventListener('touchstart', start, { passive: false });
    c.addEventListener('touchmove', move, { passive: false });
    c.addEventListener('touchend', stop);

    return () => {
      c.removeEventListener('mousedown', start);
      c.removeEventListener('mousemove', move);
      c.removeEventListener('mouseup', stop);
      c.removeEventListener('mouseleave', stop);
      c.removeEventListener('touchstart', start);
      c.removeEventListener('touchmove', move);
      c.removeEventListener('touchend', stop);
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 8 }}>
      {/* @ts-ignore */}
      <canvas
        ref={canvasRef}
        width={800}
        height={220}
        style={{
          width: '100%',
          height: '100%',
          touchAction: 'none',
          cursor: 'crosshair',
          background: '#fff',
          borderRadius: 8,
          display: 'block',
        }}
      />
    </View>
  );
});

export default SignaturePad;
