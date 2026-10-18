import Svg, { Path, Rect } from 'react-native-svg';

export interface ScanMarkIconProps {
  size: number;
  /** The four corner brackets. */
  frameColor: string;
  /** The scan line across the middle. */
  lineColor: string;
}

/**
 * ITER's scan mark: four rounded scanner corners with a scan line through the middle. Drawn from
 * the team's own design (scan_icon.svg), without its square background, so it can sit on any button.
 */
export function ScanMarkIcon({ size, frameColor, lineColor }: ScanMarkIconProps) {
  const corner = { stroke: frameColor, strokeWidth: 32, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
  return (
    <Svg width={size} height={size} viewBox="72 72 368 368">
      <Path d="M 96 176 V 128 A 32 32 0 0 1 128 96 H 192" {...corner} />
      <Path d="M 416 176 V 128 A 32 32 0 0 0 384 96 H 320" {...corner} />
      <Path d="M 96 336 V 384 A 32 32 0 0 0 128 416 H 192" {...corner} />
      <Path d="M 416 336 V 384 A 32 32 0 0 1 384 416 H 320" {...corner} />
      <Rect x={96} y={232} width={320} height={48} rx={24} fill={lineColor} />
    </Svg>
  );
}
