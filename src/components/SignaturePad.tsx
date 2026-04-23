import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import SignatureCanvas from 'react-native-signature-canvas';

export interface SignaturePadRef {
  clearSignature: () => void;
  readSignature: () => void;
}

interface Props {
  onOK: (sig: string) => void;
  webStyle?: string;
}

const SignaturePad = forwardRef<SignaturePadRef, Props>(({ onOK, webStyle }, ref) => {
  const inner = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    clearSignature: () => inner.current?.clearSignature(),
    readSignature: () => inner.current?.readSignature(),
  }));

  return (
    <SignatureCanvas
      ref={inner}
      onOK={onOK}
      onEmpty={() => {}}
      descriptionText=""
      clearText="Limpar"
      confirmText="Confirmar"
      webStyle={webStyle}
      backgroundColor="white"
    />
  );
});

export default SignaturePad;
