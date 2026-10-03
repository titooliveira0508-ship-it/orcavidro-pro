// ─── OrçaVidro Pro · Diagrama técnico com cotas ─────────────────────────────
// Renderiza o desenho técnico SVG (vista frontal esquemática) da categoria,
// proporcional às medidas digitadas. Atualiza ao vivo conforme o usuário digita.
import { gerarSvgDiagrama } from '../lib/diagrama';
import type { AlturaOpcao } from '../types';

interface Props {
  categoriaId: string;
  larguraMm?: number;
  alturaMm?: number;
  alturaOpcao?: AlturaOpcao;
  subOpcao?: string;
  titulo?: string;
  className?: string;
}

export default function DiagramaTecnico({
  categoriaId,
  larguraMm,
  alturaMm,
  alturaOpcao,
  subOpcao,
  titulo,
  className,
}: Props) {
  const svg = gerarSvgDiagrama(
    { categoriaId, larguraMm, alturaMm, alturaOpcao, subOpcao, titulo },
    { width: '100%', height: 'auto' }
  );
  return (
    <div
      className={
        className ?? 'w-full overflow-hidden rounded-2xl border border-[#16294d] bg-[#0A1628]'
      }
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
