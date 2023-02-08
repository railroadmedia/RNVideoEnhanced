import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import ExpandableView from './ExpandableView';
import { svgs } from './img/svgs';

interface ISettingsOption<T = any> {
  title: string;
  iconName: string;
  onSelect: (item: T) => void;
  data: T[];
  itemTitle: (item: T) => string;
  selected?: T;
}

const SettingsOption: React.FunctionComponent<ISettingsOption<any>> = <T,>(props: ISettingsOption<T>) => {
  const { title, iconName, onSelect, data, itemTitle, selected } = props;
  const icon =
    !!iconName && svgs[iconName]
      ? svgs[iconName]({
          height: 20,
          width: 20,
          fill: 'white'
        })
      : undefined;
  return (
    <ExpandableView
      titleStyle={{
        ...styles.expandableTitle,
        color: 'white'
      }}
      title={title}
      icon={icon}
    >
      {data.map(item => (
        <TouchableOpacity key={itemTitle(item)} onPress={() => onSelect(item)}>
          <Text style={[styles.item, selected && selected === item ? styles.selected : {}]}>{itemTitle(item)}</Text>
        </TouchableOpacity>
      ))}
    </ExpandableView>
  );
};

const styles = StyleSheet.create({
  expandableTitle: {
    paddingHorizontal: 20,
    fontFamily: 'OpenSans-Bold'
  },
  item: {
    color: '#9EC0DC',
    fontFamily: 'OpenSans',
    fontSize: 16,
    marginHorizontal: 50,
    marginVertical: 18
  },
  selected: {
    color: 'white'
  }
});

export default SettingsOption;