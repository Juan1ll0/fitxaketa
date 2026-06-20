import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Example from './Example.svelte';

describe('Example component', () => {
	it('debería renderizar el texto inicial', () => {
		render(Example);
		expect(screen.getByText(/fichar/i)).toBeInTheDocument();
	});

	it('debería responder al click del botón', async () => {
		render(Example);
		const button = screen.getByRole('button');
		await fireEvent.click(button);
		expect(button).toHaveTextContent(/fichado/i);
	});
});
