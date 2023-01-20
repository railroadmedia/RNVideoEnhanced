import React, { ReactElement } from 'react';
import { Path, Svg } from 'react-native-svg';
import type ISvg from './ISvg';

const RateSvg = ({ height, width, fill }: ISvg): ReactElement => (
  <Svg width={width} height={height} viewBox='0 0 25 25' fill='none'>
    <Path
      d='M15.3666 11.6333L12.0361 9.41299C11.3439 8.95149 10.4167 9.44773 10.4167 10.2797V14.7203C10.4167 15.5523 11.3439 16.0485 12.0361 15.587L15.3666 13.3667C15.9851 12.9544 15.9851 12.0456 15.3666 11.6333Z'
      stroke={fill}
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <Path
      d='M21.875 12.5C21.875 17.6777 17.6777 21.875 12.5 21.875C7.32233 21.875 3.125 17.6777 3.125 12.5C3.125 7.32233 7.32233 3.125 12.5 3.125C17.6777 3.125 21.875 7.32233 21.875 12.5Z'
      stroke={fill}
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </Svg>
);

export default RateSvg;
