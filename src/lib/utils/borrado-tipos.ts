/** Granularidad de borrado de jornadas (de mayor a menor alcance). */
export type Granularidad = 'año' | 'mes' | 'semana' | 'dia' | 'jornada';

/**
 * Periodo seleccionable para borrar: rango `[desde, hasta)` con su etiqueta
 * legible y el número de jornadas que contiene (para la confirmación).
 */
export interface PeriodoConDatos {
	clave: string;
	etiqueta: string;
	desde: Date;
	hasta: Date;
	conteo: number;
}

/** Alcance elegido en el selector de borrado: un rango temporal o una jornada concreta. */
export type SeleccionBorrado =
	| { tipo: 'rango'; desde: Date; hasta: Date; etiqueta: string; conteo: number }
	| { tipo: 'jornada'; id: number; etiqueta: string };
