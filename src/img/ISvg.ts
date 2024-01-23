import type { ViewStyle } from "react-native";

export default interface ISvg {
  height?: number;
  width?: number;
  fill?: string;
  active?: boolean;
  style?: ViewStyle;
}
