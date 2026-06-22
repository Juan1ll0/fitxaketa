import type { Chart } from 'chart.js';

/** Dibuja la línea de objetivo diario escalonada (un segmento horizontal por categoría/día). */
export function dibujarLineaObjetivo(c: Chart, objetivos: number[], color: string): void {
	const { ctx, chartArea, scales } = c;
	const band = (chartArea.right - chartArea.left) / objetivos.length;
	ctx.save();
	ctx.strokeStyle = color;
	ctx.lineWidth = 2;
	for (let i = 0; i < objetivos.length; i++) {
		if (objetivos[i] <= 0) continue;
		const y = scales.y.getPixelForValue(objetivos[i]);
		const cx = chartArea.left + band * (i + 0.5);
		ctx.beginPath();
		ctx.moveTo(cx - band / 2, y);
		ctx.lineTo(cx + band / 2, y);
		ctx.stroke();
	}
	ctx.restore();
}

/** Texto del balance del día con signo para el tooltip (vacío si no aplica). */
export function balanceTooltipTexto(bal: number | undefined): string {
	if (bal == null) return '';
	const signo = bal > 0 ? '+' : bal < 0 ? '−' : '';
	const h = Math.floor(Math.abs(bal) / 60);
	const m = Math.round(Math.abs(bal) % 60);
	return `Balance: ${signo}${h}h ${m}m`;
}
