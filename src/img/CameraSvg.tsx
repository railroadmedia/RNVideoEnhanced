import React, { ReactElement } from 'react';
import { Path, Svg } from 'react-native-svg';
import type ISvg from './ISvg';

const CameraSvg = ({ height, width, fill }: ISvg): ReactElement => (
  <Svg width={width} height={height} viewBox='0 0 25 25' fill='none'>
    <Path
      d='M15.625 10.4167L20.3675 8.04542C21.0601 7.69912 21.875 8.20276 21.875 8.97712V16.0229C21.875 16.7972 21.0601 17.3009 20.3675 16.9546L15.625 14.5833M5.20833 18.75H13.5417C14.6923 18.75 15.625 17.8173 15.625 16.6667V8.33333C15.625 7.18274 14.6923 6.25 13.5417 6.25H5.20833C4.05774 6.25 3.125 7.18274 3.125 8.33333V16.6667C3.125 17.8173 4.05774 18.75 5.20833 18.75Z'
      stroke={fill}
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </Svg>
);

export default CameraSvg;
