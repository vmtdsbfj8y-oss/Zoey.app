import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * The lighting rig for the landing scene.
 *
 * Deliberately several low-opacity, off-centre, elliptical sources rather than
 * one big blurred circle. A single centred blur reads as a sticker pasted over
 * a flat background; a rig reads as light that exists in the room, because each
 * source has a direction, a colour and a falloff, and they overlap unevenly.
 *
 * Sources, in draw order (back to front):
 *   ambient   a very wide violet wash lifting the whole frame off pure black
 *   key       violet, behind and slightly above her head -- the main source
 *   fill      magenta from the lower left, picking out her shoulder and the
 *             large near orb on that side
 *   rim       blue-violet from the upper right, the cool edge on her hair
 *   haze      a broad horizontal band behind her torso, so she sits *in* the
 *             atmosphere instead of in front of it
 *   floor     a soft pool under the glass card so the card looks illuminated
 *             rather than pasted on
 *
 * All positions are fractions of the frame, so the rig holds at any size.
 */
export function SceneLight({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} pointerEvents="none">
      <Defs>
        <RadialGradient id="slAmbient" cx="50%" cy="40%" r="75%">
          <Stop offset="0" stopColor="#4C1D95" stopOpacity={0.42} />
          <Stop offset="0.55" stopColor="#2E1065" stopOpacity={0.22} />
          <Stop offset="1" stopColor="#07030F" stopOpacity={0} />
        </RadialGradient>

        <RadialGradient id="slKey" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#A855F7" stopOpacity={0.55} />
          <Stop offset="0.42" stopColor="#7C3AED" stopOpacity={0.3} />
          <Stop offset="1" stopColor="#6D28D9" stopOpacity={0} />
        </RadialGradient>

        <RadialGradient id="slFill" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#E879F9" stopOpacity={0.34} />
          <Stop offset="0.45" stopColor="#C026D3" stopOpacity={0.17} />
          <Stop offset="1" stopColor="#86198F" stopOpacity={0} />
        </RadialGradient>

        <RadialGradient id="slRim" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#818CF8" stopOpacity={0.3} />
          <Stop offset="0.5" stopColor="#6366F1" stopOpacity={0.14} />
          <Stop offset="1" stopColor="#4338CA" stopOpacity={0} />
        </RadialGradient>

        <RadialGradient id="slHaze" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#8B5CF6" stopOpacity={0.26} />
          <Stop offset="1" stopColor="#8B5CF6" stopOpacity={0} />
        </RadialGradient>

        <RadialGradient id="slFloor" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#A855F7" stopOpacity={0.3} />
          <Stop offset="0.6" stopColor="#7C3AED" stopOpacity={0.12} />
          <Stop offset="1" stopColor="#7C3AED" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      <Rect x={0} y={0} width={width} height={height} fill="url(#slAmbient)" />

      {/* key -- behind her head, tall and narrow so it hugs the silhouette */}
      <Ellipse
        cx={width * 0.5}
        cy={height * 0.3}
        rx={width * 0.52}
        ry={height * 0.26}
        fill="url(#slKey)"
      />

      {/* fill -- lower left, magenta */}
      <Ellipse
        cx={width * 0.1}
        cy={height * 0.6}
        rx={width * 0.46}
        ry={height * 0.24}
        fill="url(#slFill)"
      />

      {/* rim -- upper right, cool */}
      <Ellipse
        cx={width * 0.9}
        cy={height * 0.22}
        rx={width * 0.4}
        ry={height * 0.2}
        fill="url(#slRim)"
      />

      {/* haze band across her torso */}
      <Ellipse
        cx={width * 0.5}
        cy={height * 0.47}
        rx={width * 0.8}
        ry={height * 0.13}
        fill="url(#slHaze)"
      />

      {/* pool under the glass card */}
      <Ellipse
        cx={width * 0.5}
        cy={height * 0.86}
        rx={width * 0.6}
        ry={height * 0.12}
        fill="url(#slFloor)"
      />
    </Svg>
  );
}
