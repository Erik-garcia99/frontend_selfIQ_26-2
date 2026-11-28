import Svg, { Ellipse, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { colors as C } from '../../theme/colors';
import { mapElementLabel, mapTransform } from '../../utils/mapViewport';

// Dibujo puro, compartible con futuros modos de consulta y edición.
export function MapSymbol({ element, strokeWidth }) {
  const { kind, width: w, height: h } = element;
  const common = { stroke: C.navy, strokeWidth, fill: '#e5edf4' };
  if (kind === 'ellipse') return <Ellipse {...common} cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} />;
  if (kind === 'hexagon') return <Polygon {...common} points={`${w / 4},0 ${w * 3 / 4},0 ${w},${h / 2} ${w * 3 / 4},${h} ${w / 4},${h} 0,${h / 2}`} />;
  if (kind === 'wall') return <Rect {...common} width={w} height={h} fill={C.navy} />;
  if (kind === 'window') return <G>
    <Rect {...common} width={w} height={h} fill="#e0f3f7" />
    <Line x1={0} y1={h / 3} x2={w} y2={h / 3} stroke={C.navy} strokeWidth={strokeWidth} />
    <Line x1={0} y1={h * 2 / 3} x2={w} y2={h * 2 / 3} stroke={C.navy} strokeWidth={strokeWidth} />
  </G>;
  if (kind === 'door' || kind === 'double_door') {
    const path = kind === 'door'
      ? `M 0 0 L 0 ${h} M 0 ${h} A ${w} ${h} 0 0 0 ${w} 0`
      : `M 0 0 L 0 ${h} M 0 ${h} A ${w / 2} ${h} 0 0 0 ${w / 2} 0 M ${w} 0 L ${w} ${h} M ${w} ${h} A ${w / 2} ${h} 0 0 1 ${w / 2} 0`;
    return <G>
      <Line x1={0} y1={0} x2={w} y2={0} stroke={C.navy} strokeWidth={strokeWidth} strokeDasharray={`${strokeWidth * 3} ${strokeWidth * 3}`} />
      <Path d={path} fill="none" stroke={C.navy} strokeWidth={strokeWidth} />
    </G>;
  }
  return <Rect {...common} width={w} height={h} />;
}

export default function MapScene({ document, viewport, camera, selectedId }) {
  const { scale, left, top } = mapTransform(document, viewport, camera);
  const stroke = 1.5 / scale;
  return <Svg width={viewport.width} height={viewport.height} viewBox={`0 0 ${viewport.width} ${viewport.height}`}>
    <G transform={`translate(${left} ${top}) scale(${scale})`}>
      <Rect width={document.width} height={document.height} fill="#fff" stroke={C.navy} strokeWidth={stroke} />
      {Array.from({ length: 9 }, (_, index) => {
        const fraction = (index + 1) / 10;
        return <G key={index}>
          <Line x1={document.width * fraction} y1={0} x2={document.width * fraction} y2={document.height} stroke="#e3e8ee" strokeWidth={1 / scale} />
          <Line x1={0} y1={document.height * fraction} x2={document.width} y2={document.height * fraction} stroke="#e3e8ee" strokeWidth={1 / scale} />
        </G>;
      })}
      {document.elements.map(element => {
        const cx = element.x + element.width / 2, cy = element.y + element.height / 2;
        const selected = element.id === selectedId;
        const label = mapElementLabel(element);
        return <G key={element.id}>
          <G transform={`rotate(${element.rotation || 0} ${cx} ${cy}) translate(${element.x} ${element.y})`}>
            <MapSymbol element={element} strokeWidth={stroke} />
            {selected ? <Rect x={-3 / scale} y={-3 / scale} width={element.width + 6 / scale}
              height={element.height + 6 / scale} fill="none" stroke="#006b65" strokeWidth={3 / scale} /> : null}
          </G>
          {element.width * scale >= 44 && element.height * scale >= 24
            ? <SvgText x={cx} y={cy} textAnchor="middle" dy={4 / scale} fontSize={12 / scale}
              fill={element.kind === 'wall' ? '#fff' : C.navy} fontWeight="600">
              {label.length > 20 ? `${label.slice(0, 19)}…` : label}
            </SvgText> : null}
        </G>;
      })}
    </G>
  </Svg>;
}
