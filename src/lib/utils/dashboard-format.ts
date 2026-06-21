export function formatearFecha(date: Date): string {
	return new Intl.DateTimeFormat('es-ES', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	}).format(date);
}

export function formatearFechaLarga(date: Date): string {
	const formatter = new Intl.DateTimeFormat('es-ES', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
	return formatter
		.formatToParts(date)
		.map((part) =>
			part.type === 'month'
				? `${part.value.charAt(0).toUpperCase()}${part.value.slice(1)}`
				: part.value
		)
		.join('');
}

export function formatearHora(date: Date): string {
	return new Intl.DateTimeFormat('es-ES', {
		hour: '2-digit',
		minute: '2-digit'
	}).format(date);
}

export function formatearDuracion(minutos: number | null): string {
	if (minutos === null) return 'En curso';
	const h = Math.floor(minutos / 60);
	const m = minutos % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

export function formatearHorasDecimal(horas: number): string {
	const totalMinutos = Math.round(horas * 60);
	const h = Math.floor(totalMinutos / 60);
	const m = totalMinutos % 60;
	return `${h}h ${m}m`;
}
