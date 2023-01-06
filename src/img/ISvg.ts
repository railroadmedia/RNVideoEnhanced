export default interface ISvg {
  height?: number;
  width?: number;
  fill?: string;
  active?: boolean;
}

export interface ISubbanerCardSvg extends ISvg {
  children: any;
}
