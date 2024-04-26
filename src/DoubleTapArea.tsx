import React, { FunctionComponent, ReactNode, useCallback, useRef } from 'react';
import { TouchableOpacity, ViewStyle } from 'react-native';

interface IDoubleTapArea {
  children?: ReactNode;
  styles: ViewStyle;
  onDoubleTap: () => void;
  onSingleTap?: () => void;
}

const DoubleTapArea: FunctionComponent<IDoubleTapArea> = ({
  children,
  styles,
  onDoubleTap,
  onSingleTap,
}) => {
  const clickCount = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const onTap = useCallback(() => {
    clickCount.current++;
    if (clickCount.current === 2) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      onDoubleTap();
      clickCount.current = 0;
    } else {
      timeoutRef.current = setTimeout(() => {
        clickCount.current = 0;
        onSingleTap?.();
      }, 300);
    }
    return () => clearTimeout(timeoutRef.current);
  }, [onDoubleTap, onSingleTap]);

  return (
    <TouchableOpacity onPress={onTap} style={styles} activeOpacity={1}>
      {children}
    </TouchableOpacity>
  );
};

export default DoubleTapArea;
