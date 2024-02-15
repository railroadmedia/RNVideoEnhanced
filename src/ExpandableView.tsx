import React, {
  FunctionComponent,
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { View, Text, TouchableOpacity, TextStyle, ViewStyle, StyleSheet } from 'react-native';
import { arrowUp, arrowDown } from './img/svgs';

interface IExpandableView {
  titleStyle: TextStyle;
  title: string;
  icon?: ReactElement;
  processType?: string;
  expandableContStyle?: ViewStyle;
  dropStyle?: ViewStyle;
  iconColor?: string;
  maxFontMultiplier?: number;
  children: ReactNode;
}

const ExpandableView: FunctionComponent<IExpandableView> = props => {
  const {
    titleStyle,
    title,
    icon,
    children,
    processType,
    expandableContStyle,
    dropStyle,
    iconColor,
    maxFontMultiplier,
  } = props;
  const [maxHeight, setMaxHeight] = useState<number>();
  const [contentVisible, setContentVisible] = useState<boolean>();

  useEffect(() => {
    switch (processType) {
      case 'RAM': {
        setMaxHeight(0);
        break;
      }
      case 'CPU': {
        setContentVisible(false);
        break;
      }
      default: {
        setContentVisible(false);
        break;
      }
    }
  }, []);

  const toggleView = useCallback(() => {
    switch (processType) {
      case 'RAM': {
        setMaxHeight(mHeight => (mHeight ? 0 : 100000));
        break;
      }
      case 'CPU': {
        setContentVisible(cVisible => !cVisible);
        break;
      }
      default: {
        setContentVisible(cVisible => !cVisible);
        break;
      }
    }
  }, [processType]);

  return (
    <View testID='expandableCont' style={expandableContStyle}>
      <TouchableOpacity testID='dropBtn' onPress={toggleView} style={[styles.dropBtn, dropStyle]}>
        {!!icon && icon}
        <Text
          testID='title'
          maxFontSizeMultiplier={maxFontMultiplier}
          style={[titleStyle, styles.titleText]}
        >
          {title}
        </Text>
        {(contentVisible || !!maxHeight) &&
          arrowUp({
            height: 20,
            width: 20,
            fill: iconColor || '#ffffff',
          })}
        {!contentVisible &&
          !maxHeight &&
          arrowDown({
            height: 20,
            width: 20,
            fill: iconColor || '#ffffff',
          })}
      </TouchableOpacity>
      {contentVisible === undefined ? (
        <View style={[styles.childrenCont, { maxHeight }]}>{children}</View>
      ) : (
        contentVisible && children
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dropBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    height: 50,
  },
  titleText: {
    flex: 1,
  },
  childrenCont: {
    overflow: 'hidden',
  },
});

export default ExpandableView;
