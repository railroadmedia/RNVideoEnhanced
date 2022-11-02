import React from 'react';
import { TouchableOpacity } from 'react-native';

const DoubleTapArea = ({ children, onDoubleTap, onSingleTap, styles }) => {
  let clickCount = 0;
  let timeout = null;

  const onTap = () => {
    clickCount++;
    if (clickCount === 2) {
      if (timeout) {
        clearTimeout(timeout);
      }
      onDoubleTap();
      clickCount = 0;
    } else {
      timeout = setTimeout(() => {
        clickCount = 0;
        onSingleTap?.();
      }, 300);
    }
  };

  return (
    <TouchableOpacity onPress={onTap} style={styles} activeOpacity={1}>
      {children}
    </TouchableOpacity>
  );
};

export default DoubleTapArea;
