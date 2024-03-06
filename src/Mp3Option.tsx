import React, { useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { svgs } from './img/svgs';
import type { IMp3 } from './entity';

interface IMp3Option {
  mp3: IMp3;
  selectMp3: (selectedMp3: IMp3) => void;
  formatMP3Name: (mp3?: string) => string | undefined;
  maxFontMultiplier?: number;
  primaryColor?: string;
}

const Mp3Option: React.FunctionComponent<IMp3Option> = props => {
  const { mp3, selectMp3, formatMP3Name, maxFontMultiplier, primaryColor } = props;

  const onPressMp3Option = useCallback(() => selectMp3(mp3), [selectMp3, mp3]);

  return (
    <TouchableOpacity
      key={mp3?.id}
      onPress={onPressMp3Option}
      style={{
        ...styles.mp3OptionContainer,
        backgroundColor: '#F7F9FC',
        borderBottomColor: '#E1E6EB',
      }}
    >
      <Text
        maxFontSizeMultiplier={maxFontMultiplier}
        style={{
          ...styles.mp3OptionText,
          color: mp3?.selected ? primaryColor || 'blue' : 'black',
        }}
      >
        {formatMP3Name(mp3?.key)}
      </Text>
      {mp3?.selected && (
        <View style={styles.checkIconCont}>
          {svgs.check({
            width: 23,
            height: 23,
            fill: 'black',
          })}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  mp3OptionContainer: {
    padding: 10,
    alignItems: 'center',
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  mp3OptionText: {
    flex: 1,
    fontSize: 10,
    paddingLeft: 13,
    fontFamily: 'OpenSans',
  },
  checkIconCont: {
    marginRight: 10,
  },
});

export default Mp3Option;
